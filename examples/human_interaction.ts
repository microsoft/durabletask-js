// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { TaskHubGrpcClient } from "../src/client/client";
import { whenAny } from "../src/task";
import { ActivityContext } from "../src/task/context/activity-context";
import { OrchestrationContext } from "../src/task/context/orchestration-context";
import { Task } from "../src/task/task";
import { TOrchestrator } from "../src/types/orchestrator.type";
import { TaskHubGrpcWorker } from "../src/worker/task-hub-grpc-worker";
import * as readlineSync from "readline-sync";

// Wrap the entire code in an immediately-invoked async function
(async () => {
  class Order {
    cost: number;
    product: string;
    quantity: number;
    constructor(cost: number, product: string, quantity: number) {
      this.cost = cost;
      this.product = product;
      this.quantity = quantity;
    }
  }

  function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Update the gRPC client and worker to use a local address and port
  const grpcServerAddress = "localhost:4001";
  const taskHubClient: TaskHubGrpcClient = new TaskHubGrpcClient(grpcServerAddress);
  const taskHubWorker: TaskHubGrpcWorker = new TaskHubGrpcWorker(grpcServerAddress);

  //Activity function that sends an approval request to the manager
  const sendApprovalRequest = async (_: ActivityContext, order: Order) => {
    // Simulate some work that takes an amount of time
    await sleep(3000);
    console.log(`Sending approval request for order: ${order.product}`);
  };

  // Activity function that places an order
  const placeOrder = async (_: ActivityContext, order: Order) => {
    console.log(`Placing order: ${order.product}`);
  };

  // Orchestrator function that represents a purchase order workflow
  const purchaseOrderWorkflow: TOrchestrator = async function* (ctx: OrchestrationContext, order: Order): any {
    // Orders under $1000 are auto-approved
    if (order.cost < 1000) {
      return "Auto-approved";
    }

    // Orders of $1000 or more require manager approval
    yield ctx.callActivity(sendApprovalRequest, order);

    // Approvals must be received within 24 hours or they will be cancled.
    const tasks: Task<any>[] = [];
    const approvalEvent = ctx.waitForExternalEvent("approval_received");
    const timeoutEvent = ctx.createTimer(24 * 60 * 60);
    tasks.push(approvalEvent);
    tasks.push(timeoutEvent);
    const winner = whenAny(tasks);

    if (winner == timeoutEvent) {
      return "Cancelled";
    }

    yield ctx.callActivity(placeOrder, order);
    const approvalDetails = approvalEvent.getResult();
    return `Approved by ${approvalDetails.approver}`;
  };

  taskHubWorker.addOrchestrator(purchaseOrderWorkflow);
  taskHubWorker.addActivity(sendApprovalRequest);
  taskHubWorker.addActivity(placeOrder);

  // Wrap the worker startup in a try-catch block to handle any errors during startup
  try {
    await taskHubWorker.start();
    console.log("Worker started successfully");
  } catch (error) {
    console.error("Error starting worker:", error);
  }

  // Schedule a new orchestration
  try {
    const cost = readlineSync.question("Cost of your order:");
    const approver = readlineSync.question("Approver of your order:");
    const timeout = readlineSync.question("Timeout for your order in seconds:");
    const order = new Order(cost, "MyProduct", 1);
    const id = await taskHubClient.scheduleNewOrchestration(purchaseOrderWorkflow, order);
    console.log(`Orchestration scheduled with ID: ${id}`);

    if (readlineSync.keyInYN("Press [Y] to approve the order... Y/yes, N/no")) {
      const approvalEvent = { approver: approver };
      await taskHubClient.raiseOrchestrationEvent(id, "approval_received", approvalEvent);
    } else {
      return "Order rejected";
    }

    // Wait for orchestration completion
    const state = await taskHubClient.waitForOrchestrationCompletion(id, undefined, timeout + 2);

    console.log(`Orchestration completed! Result: ${state?.serializedOutput}`);
  } catch (error) {
    console.error("Error scheduling or waiting for orchestration:", error);
  }

  // stop worker and client
  await taskHubWorker.stop();
  await taskHubClient.stop();
})();

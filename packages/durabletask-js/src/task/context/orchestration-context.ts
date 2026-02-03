// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { TActivity } from "../../types/activity.type";
import { TOrchestrator } from "../../types/orchestrator.type";
import { Logger } from "../../types/logger.type";
import { ReplaySafeLogger } from "../../types/replay-safe-logger";
import { TaskOptions, SubOrchestrationOptions } from "../options";
import { Task } from "../task";

export abstract class OrchestrationContext {
  /**
   * The instance ID of the currently executing orchestration.
   *
   * The instance ID is generated and fixed when the orchestrator function is scheduled. It can be either auto-generated, in which
   * case it is a GUID, or it can be user-specified with any format.
   *
   * @returns {string} The instance ID of the currently executing orchestration.
   */
  abstract get instanceId(): string;

  /**
   * Get the current date/time as UTC
   *
   * @returns {Date} The current timestamp in a way that is safe for use by orchestrator functions
   */
  abstract get currentUtcDateTime(): Date;

  /**
   * Get the value indicating whether the orchestrator is replaying from history.
   *
   * This property is useful when there is logic that needs to run only when
   * the orchestrator function is _not_ replaying. For example, certain
   * types of application logging may become too noisy when duplicated as
   * part of orchestrator function replay. The orchestrator code could check
   * to see whether the function is being replayed and then issue the log
   * statements when this value is `false`.
   *
   * @returns {boolean} `true` if the orchestrator function is replaying from history; otherwise, `false`.
   */
  abstract get isReplaying(): boolean;

  /**
   * Gets the version of the current orchestration instance.
   *
   * The version is set when the orchestration instance is created via the client's
   * scheduleNewOrchestration method using StartOrchestrationOptions.version.
   * If no version was specified, this returns an empty string.
   *
   * @returns {string} The version of the current orchestration instance.
   */
  abstract get version(): string;

  /**
   * Create a timer task that will fire at a specified time.
   *
   * @param {Date | number} fireAt The time at which the timer should fire.
   * @returns {Task} A Durable Timer task that schedules the timer to wake up the orchestrator
   */
  abstract createTimer(fireAt: Date | number): Task<any>;

  /**
   * Schedule an activity for execution.
   *
   * @param {TActivity} activity The activity function to call.
   * @param {TInput} input The JSON-serializable input value for the activity function.
   * @param {TaskOptions} options Optional options to control the behavior of the activity execution, including retry policies.
   *
   * @returns {Task<TOutput>} A Durable Task that completes when the activity function completes.
   */
  abstract callActivity<TInput, TOutput>(
    activity: TActivity<TInput, TOutput> | string,
    input?: TInput,
    options?: TaskOptions,
  ): Task<TOutput>;

  /**
   * Schedule sub-orchestrator function for execution.
   *
   * @param orchestrator A reference to the orchestrator function to call.
   * @param input The JSON-serializable input value for the orchestrator function.
   * @param options Optional options to control the behavior of the sub-orchestration, including retry policies and instance ID.
   *
   * @returns {Task<TOutput>} A Durable Task that completes when the sub-orchestrator function completes.
   */
  abstract callSubOrchestrator<TInput, TOutput>(
    orchestrator: TOrchestrator | string,
    input?: TInput,
    options?: SubOrchestrationOptions,
  ): Task<TOutput>;

  /**
   * Wait for an event to be raised with the name "name"
   *
   * @param name The name of the event to wait for
   * @returns {Task} A Durable Task that completes when the event is received
   */
  abstract waitForExternalEvent(name: string): Task<any>;

  /**
   * Continue the orchestration execution as a new instance
   *
   * @param newInput {any} The new input to use for the new orchestration instance.
   * @param saveEvents {boolean} A flag indicating whether to add any unprocessed external events in the new orchestration history.
   */
  abstract continueAsNew(newInput: any, saveEvents: boolean): void;

  /**
   * Sets a custom status value for the current orchestration instance.
   *
   * The custom status value is serialized and stored in orchestration state and will
   * be made available to the orchestration status query APIs. The serialized value
   * must not exceed 16 KB of UTF-16 encoded text.
   *
   * @param {any} customStatus A JSON-serializable value to assign as the custom status, or `null`/`undefined` to clear it.
   */
  abstract setCustomStatus(customStatus: any): void;

  /**
   * Sends an event to another orchestration instance.
   *
   * The target orchestration can handle the sent event using the `waitForExternalEvent()` method.
   * If the target orchestration doesn't exist or has completed, the event will be silently dropped.
   *
   * @param {string} instanceId The ID of the orchestration instance to send the event to.
   * @param {string} eventName The name of the event. Event names are case-insensitive.
   * @param {any} eventData The JSON-serializable payload of the event.
   */
  abstract sendEvent(instanceId: string, eventName: string, eventData?: any): void;

  /**
   * Creates a new UUID that is safe for replay within an orchestration.
   *
   * This method generates a deterministic UUID v5 using the algorithm from RFC 4122 §4.3.
   * The name input used to generate this value is a combination of the orchestration instance ID,
   * the current UTC datetime, and an internally managed sequence counter.
   *
   * Use this method instead of random UUID generators (like `crypto.randomUUID()`) to ensure
   * deterministic execution during orchestration replay.
   *
   * @returns {string} A new deterministic UUID string.
   */
  abstract newGuid(): string;

  /**
   * Creates a replay-safe logger that only writes logs when the orchestrator is not replaying.
   *
   * During orchestration replay, history events are re-processed to rebuild state.
   * This can cause duplicate log entries if not handled properly. The returned logger
   * wraps the provided logger and automatically suppresses log output during replay,
   * ensuring that logs are only written once when the orchestration is making forward progress.
   *
   * @param {Logger} logger The underlying logger to wrap.
   * @returns {Logger} A replay-safe logger instance.
   *
   * @example
   * ```typescript
   * const orchestrator: TOrchestrator = async function* (ctx, input) {
   *   const logger = ctx.createReplaySafeLogger(myLogger);
   *   logger.info("This will only be logged once, not during replay");
   *   yield ctx.callActivity(myActivity, input);
   * };
   * ```
   */
  createReplaySafeLogger(logger: Logger): Logger {
    return new ReplaySafeLogger(this, logger);
  }
}

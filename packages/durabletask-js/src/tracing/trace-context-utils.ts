// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as pb from "../proto/orchestrator_service_pb";
import { StringValue } from "google-protobuf/google/protobuf/wrappers_pb";
import { randomBytes } from "crypto";
import type { Span, Context, SpanContext, TraceState } from "@opentelemetry/api";

/**
 * Regex pattern for validating W3C traceparent format.
 * Format: "00-{traceId32hex}-{spanId16hex}-{flags2hex}"
 */
const TRACEPARENT_REGEX = /^00-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/;

/**
 * Parses a W3C traceparent string into its components.
 *
 * @param traceparent - A W3C traceparent string (e.g., "00-TRACEID-SPANID-FLAGS").
 * @returns The parsed components, or undefined if the string is invalid.
 */
export function parseTraceparent(
  traceparent: string,
): { traceId: string; spanId: string; traceFlags: number } | undefined {
  const match = traceparent.match(TRACEPARENT_REGEX);
  if (!match) {
    return undefined;
  }
  return {
    traceId: match[1],
    spanId: match[2],
    traceFlags: parseInt(match[3], 16),
  };
}

/**
 * Creates a W3C traceparent string from its components.
 *
 * @param traceId - The 32-character hex trace ID.
 * @param spanId - The 16-character hex span ID.
 * @param traceFlags - The trace flags byte (0-255).
 * @returns The formatted traceparent string.
 * @throws {Error} If traceId or spanId have invalid format.
 */
export function createTraceparent(traceId: string, spanId: string, traceFlags: number = 1): string {
  if (!/^[0-9a-fA-F]{32}$/.test(traceId)) {
    throw new Error(`Invalid traceId: expected 32 hex characters, got '${traceId}'`);
  }
  if (!/^[0-9a-fA-F]{16}$/.test(spanId)) {
    throw new Error(`Invalid spanId: expected 16 hex characters, got '${spanId}'`);
  }
  const normalizedTraceId = traceId.toLowerCase();
  const normalizedSpanId = spanId.toLowerCase();
  const flagsByte = traceFlags & 0xff;
  const flags = flagsByte.toString(16).padStart(2, "0");
  return `00-${normalizedTraceId}-${normalizedSpanId}-${flags}`;
}

/**
 * Generates a random 16-character hex span ID.
 */
export function generateSpanId(): string {
  return randomBytes(8).toString("hex");
}

/**
 * Creates a protobuf TraceContext from a traceparent and optional tracestate.
 *
 * @param traceparent - The W3C traceparent string.
 * @param tracestate - The optional W3C tracestate string.
 * @returns A new protobuf TraceContext.
 */
export function createPbTraceContext(traceparent: string, tracestate?: string): pb.TraceContext {
  const ctx = new pb.TraceContext();
  ctx.setTraceparent(traceparent);

  // Extract the span ID from the traceparent
  const parsed = parseTraceparent(traceparent);
  if (parsed) {
    ctx.setSpanid(parsed.spanId);
  }

  if (tracestate) {
    const sv = new StringValue();
    sv.setValue(tracestate);
    ctx.setTracestate(sv);
  }

  return ctx;
}

/**
 * Attempts to load the OpenTelemetry API module.
 * Returns undefined if the module is not installed (it's an optional peer dependency).
 *
 * Note: Uses synchronous `require()` because the result is cached and callers
 * throughout the tracing layer depend on synchronous access. The compiled output
 * targets CommonJS, so `require()` is safe. If the project migrates to ESM output
 * in the future, this should be changed to an async initialization pattern.
 */
let _otelApi: typeof import("@opentelemetry/api") | undefined;
let _otelApiLoaded = false;

export function getOtelApi(): typeof import("@opentelemetry/api") | undefined {
  if (!_otelApiLoaded) {
    _otelApiLoaded = true;
    try {
      _otelApi = require("@opentelemetry/api");
    } catch {
      _otelApi = undefined;
    }
  }
  return _otelApi;
}

/**
 * Extracts traceparent and tracestate from a span's SpanContext.
 * Returns undefined if OTEL is not available or span is not valid.
 */
export function extractTraceparentFromSpan(span: Span | undefined | null): { traceparent: string; tracestate?: string } | undefined {
  const otel = getOtelApi();
  if (!otel) return undefined;

  const spanContext = span?.spanContext?.();
  if (!spanContext || !otel.isSpanContextValid(spanContext)) {
    return undefined;
  }

  const traceparent = createTraceparent(spanContext.traceId, spanContext.spanId, spanContext.traceFlags ?? 1);
  const tracestate = spanContext.traceState?.serialize();
  return { traceparent, tracestate };
}

/**
 * Creates a protobuf TraceContext directly from a Span, avoiding the
 * format→parse roundtrip of extractTraceparentFromSpan + createPbTraceContext.
 * Returns undefined if the span context is not valid.
 */
export function createPbTraceContextFromSpan(span: Span): pb.TraceContext | undefined {
  const otel = getOtelApi();
  if (!otel) return undefined;

  const spanContext = span.spanContext();
  if (!otel.isSpanContextValid(spanContext)) {
    return undefined;
  }

  const flags = (spanContext.traceFlags & 0xff).toString(16).padStart(2, "0");
  const traceparent = `00-${spanContext.traceId}-${spanContext.spanId}-${flags}`;

  const ctx = new pb.TraceContext();
  ctx.setTraceparent(traceparent);
  ctx.setSpanid(spanContext.spanId);

  const tracestate = spanContext.traceState?.serialize();
  if (tracestate) {
    const sv = new StringValue();
    sv.setValue(tracestate);
    ctx.setTracestate(sv);
  }

  return ctx;
}

/**
 * Creates an OTEL Context with a remote parent span from a protobuf TraceContext.
 * Returns undefined if OTEL is not available or the pbTraceContext is not provided.
 * Returns ROOT_CONTEXT if the traceparent is missing or invalid.
 */
export function createParentContextFromPb(pbTraceContext: pb.TraceContext | undefined): Context | undefined {
  const otel = getOtelApi();
  if (!otel || !pbTraceContext) {
    return undefined;
  }

  const traceparent = pbTraceContext.getTraceparent();
  if (!traceparent) {
    return otel.ROOT_CONTEXT;
  }

  const parsed = parseTraceparent(traceparent);
  if (!parsed) {
    return otel.ROOT_CONTEXT;
  }

  let traceState: TraceState | undefined;
  const traceStateStr = pbTraceContext.getTracestate()?.getValue();
  if (traceStateStr) {
    traceState = otel.createTraceState(traceStateStr);
  }

  const spanContext: SpanContext = {
    traceId: parsed.traceId,
    spanId: parsed.spanId,
    traceFlags: parsed.traceFlags,
    isRemote: true,
    traceState,
  };

  return otel.trace.setSpanContext(otel.ROOT_CONTEXT, spanContext);
}

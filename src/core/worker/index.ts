/**
 * Glint Core - Worker Entry Point
 * Exports AI Worker API types and initialization
 */

export type { WorkerAPI } from '../../lib/ai/workerBridge';
export { workerBridge } from '../../lib/ai/workerBridge';

// Re-export worker for CRXJS entry point
import './aiWorker';

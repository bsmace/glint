/**
 * Glint Core - Engine Entry Point
 * Re-exports the DetectionManager and strategies for clean imports.
 */

export { DetectionManager } from "../detection-manager";
export { 
  AriaInputStrategy, 
  ContentEditableStrategy, 
  defaultStrategies,
  type DetectionStrategy,
  type InputContext
} from "../strategies";

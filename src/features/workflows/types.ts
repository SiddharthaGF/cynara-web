export type WorkflowStatus = 'draft' | 'review' | 'published' | 'retired';

export interface WorkflowSummary {
  code: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  editableVersionId: string | null;
  editableStatus: string | null;
  editableRowVersion: number | null;
  publishedVersions: string[];
}

export interface WorkflowVersion {
  id: string;
  code: string;
  version: string | null;
  status: string;
  workflowSchemaJson: string;
  contentHash: string | null;
  rowVersion: number;
  createdAt: string;
  submittedForReviewAt: string | null;
  publishedAt: string | null;
  retiredAt: string | null;
  publishedSchemaVersion: string | null;
  lastReviewComment: string | null;
  lastReviewDecision: string | null;
  lastReviewedAt: string | null;
}

/** Who performs a workflow task; at least one of actor/role/discipline. */
export interface WorkflowAssignee {
  actor?: string;
  role?: string;
  discipline?: string;
}

export type WorkflowNodeType = 'start' | 'end' | 'task' | 'decision';

interface WorkflowNodeBase {
  id: string;
  name?: string;
  description?: string;
}

export interface WorkflowStartNode extends WorkflowNodeBase {
  type: 'start';
}

export interface WorkflowEndNode extends WorkflowNodeBase {
  type: 'end';
}

export interface WorkflowTaskNode extends WorkflowNodeBase {
  type: 'task';
  assignee?: WorkflowAssignee;
  formCode?: string;
  formVersion?: string;
  dueDays?: number;
}

export interface WorkflowDecisionNode extends WorkflowNodeBase {
  type: 'decision';
}

export type WorkflowNode =
  | WorkflowStartNode
  | WorkflowEndNode
  | WorkflowTaskNode
  | WorkflowDecisionNode;

export type WorkflowComparisonOp = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte';
export type WorkflowBooleanOp = 'and' | 'or' | 'not';
export type WorkflowUtilityOp = 'empty' | 'coalesce';

export type WorkflowExpression =
  | { ref: string }
  | { lit: string | number | boolean | null | string[] }
  | {
      op: WorkflowComparisonOp | WorkflowBooleanOp | WorkflowUtilityOp;
      args: WorkflowExpression[];
    };

export interface WorkflowEdge {
  from: string;
  to: string;
  label?: string;
  condition?: WorkflowExpression;
}

export interface WorkflowGraph {
  $schema?: string;
  schemaVersion: string;
  inputs?: string[];
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

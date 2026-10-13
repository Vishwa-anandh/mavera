import type { IdocDirection } from '../../../data-access';

export type IdocLifecycle = 'Received' | 'Waiting' | 'Processing' | 'Completed' | 'Failed' | 'Unmapped';

export interface IdocStatusInfo {
  code: string;
  description: string;
  lifecycle: IdocLifecycle;
  /** Whether SAP lets this status be reprocessed directly (BD87); otherwise `reprocessHint` says why not. */
  reprocessable: boolean;
  reprocessHint?: string;
}

/**
 * Standard SAP IDoc status meanings (00–49 outbound, 50–99 inbound) for the codes this product
 * maps. Anything else stays visible as "Unmapped status" with its code rather than being guessed
 * (MAVERA_DESIGN_SYSTEM.md IDOC-04). Reprocess support reflects what SAP itself allows; whether a
 * given user may trigger it is still checked by the backend.
 */
const STATUS_TABLE: Record<string, Omit<IdocStatusInfo, 'code'>> = {
  '01': { description: 'IDoc generated', lifecycle: 'Received', reprocessable: false },
  '02': { description: 'Error passing data to port', lifecycle: 'Failed', reprocessable: true },
  '03': { description: 'Data passed to port OK', lifecycle: 'Completed', reprocessable: false },
  '12': { description: 'Dispatch OK', lifecycle: 'Completed', reprocessable: false },
  '26': { description: 'Error during syntax check of IDoc (outbound)', lifecycle: 'Failed', reprocessable: false, reprocessHint: 'Fix the segment data in the sending application and send a new IDoc; a syntax error can’t be reprocessed as is.' },
  '29': { description: 'Error in ALE service', lifecycle: 'Failed', reprocessable: true },
  '30': { description: 'IDoc ready for dispatch (ALE service)', lifecycle: 'Waiting', reprocessable: false },
  '50': { description: 'IDoc added', lifecycle: 'Received', reprocessable: false },
  '51': { description: 'Application document not posted', lifecycle: 'Failed', reprocessable: true },
  '53': { description: 'Application document posted', lifecycle: 'Completed', reprocessable: false },
  '56': { description: 'IDoc with errors added', lifecycle: 'Failed', reprocessable: false, reprocessHint: 'Maintain the partner profile (WE20) first; the IDoc can then be reprocessed.' },
  '62': { description: 'IDoc passed to application', lifecycle: 'Processing', reprocessable: false },
  '64': { description: 'IDoc ready to be transferred to application', lifecycle: 'Waiting', reprocessable: false },
  '66': { description: 'IDoc is waiting for predecessor IDoc (serialization)', lifecycle: 'Waiting', reprocessable: false },
};

export function statusInfo(code: string): IdocStatusInfo {
  const known = STATUS_TABLE[code];
  return known ? { code, ...known } : { code, description: `Unmapped status ${code}`, lifecycle: 'Unmapped', reprocessable: false, reprocessHint: 'This status isn’t mapped in Mavera yet, so no recovery action is offered.' };
}

export const LIFECYCLE_ORDER: IdocLifecycle[] = ['Received', 'Waiting', 'Processing', 'Failed', 'Completed', 'Unmapped'];

export const LIFECYCLE_TONE: Record<IdocLifecycle, 'neutral' | 'info' | 'warning' | 'danger' | 'success'> = {
  Received: 'neutral', Waiting: 'warning', Processing: 'info', Failed: 'danger', Completed: 'success', Unmapped: 'neutral',
};

/** Open = not finished either way: still received, waiting, processing or unmapped. */
export function isOpen(lifecycle: IdocLifecycle): boolean {
  return lifecycle !== 'Completed' && lifecycle !== 'Failed';
}

export const DIRECTIONS: IdocDirection[] = ['Inbound', 'Outbound'];

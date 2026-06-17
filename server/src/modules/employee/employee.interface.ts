import { Types } from 'mongoose';
import { TRecordStatus } from '../../constant/ledgerTypes';

export interface IEmployee {
  name: string;
  phone?: string;
  position?: string;
  salary?: number;
  address?: string;
  note?: string;
  status?: TRecordStatus;
  createdBy: Types.ObjectId;
}

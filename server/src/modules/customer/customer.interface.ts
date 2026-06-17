import { Types } from 'mongoose';
import { TRecordStatus } from '../../constant/ledgerTypes';

export interface ICustomer {
  name: string;
  phone?: string;
  address?: string;
  note?: string;
  status?: TRecordStatus;
  createdBy: Types.ObjectId;
}

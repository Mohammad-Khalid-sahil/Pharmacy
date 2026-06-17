import httpStatus from 'http-status';
import asyncHandler from '../../lib/asyncHandler';
import sendResponse from '../../lib/sendResponse';
import backupLogServices from './backupLog.services';

class BackupLogControllers {
  create = asyncHandler(async (req, res) => {
    const result = await backupLogServices.createBackup(req.user._id);
    sendResponse(res, { success: true, statusCode: httpStatus.CREATED, message: 'Database backup created successfully!', data: result });
  });

  readAll = asyncHandler(async (req, res) => {
    const result = await backupLogServices.readAll(req.user._id);
    sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'Backup logs retrieved successfully!', data: result });
  });

  download = asyncHandler(async (req, res) => {
    const log = await backupLogServices.getDownload(req.params.id, req.user._id);
    res.download(log.filePath, log.fileName);
  });

  restore = asyncHandler(async (req, res) => {
    const result = await backupLogServices.restore(req.params.id, req.user._id);
    sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'Backup restored successfully!', data: result });
  });

  delete = asyncHandler(async (req, res) => {
    await backupLogServices.delete(req.params.id, req.user._id);
    sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'Backup deleted successfully!' });
  });
}

export default new BackupLogControllers();

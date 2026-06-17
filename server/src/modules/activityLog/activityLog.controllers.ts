import httpStatus from 'http-status';
import asyncHandler from '../../lib/asyncHandler';
import sendResponse from '../../lib/sendResponse';
import paginationMeta from '../../lib/paginationMeta';
import activityLogServices from './activityLog.services';

class ActivityLogControllers {
  readAll = asyncHandler(async (req, res) => {
    const result = await activityLogServices.readAll(req.query);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'Activity logs retrieved successfully',
      meta: paginationMeta(req.query, result.totalCount),
      data: result.data
    });
  });
}

export default new ActivityLogControllers();

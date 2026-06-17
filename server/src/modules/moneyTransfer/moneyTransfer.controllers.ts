import httpStatus from 'http-status';
import asyncHandler from '../../lib/asyncHandler';
import sendResponse from '../../lib/sendResponse';
import paginationMeta from '../../lib/paginationMeta';
import moneyTransferServices from './moneyTransfer.services';

class MoneyTransferControllers {
  create = asyncHandler(async (req, res) => {
    const result = await moneyTransferServices.create(req.body, req.user._id);
    sendResponse(res, { success: true, statusCode: httpStatus.CREATED, message: 'Money transfer recorded successfully!', data: result });
  });

  readAll = asyncHandler(async (req, res) => {
    const result = await moneyTransferServices.readAll(req.query, req.user._id);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'Money transfers retrieved successfully',
      meta: paginationMeta(req.query, result.totalCount),
      data: result.data
    });
  });
}

export default new MoneyTransferControllers();

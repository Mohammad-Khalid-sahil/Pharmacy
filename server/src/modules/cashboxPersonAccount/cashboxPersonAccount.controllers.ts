import httpStatus from 'http-status';
import asyncHandler from '../../lib/asyncHandler';
import sendResponse from '../../lib/sendResponse';
import paginationMeta from '../../lib/paginationMeta';
import logActivity from '../../lib/logActivity';
import cashboxPersonAccountServices from './cashboxPersonAccount.services';

class CashboxPersonAccountControllers {
  readAll = asyncHandler(async (req, res) => {
    const result = await cashboxPersonAccountServices.readAll(req.query, req.user._id);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'Cashbox person accounts retrieved successfully',
      meta: paginationMeta(req.query, result.totalCount),
      data: result.data,
    });
  });

  readSingle = asyncHandler(async (req, res) => {
    const result = await cashboxPersonAccountServices.read(req.params.id, req.user._id);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'Person account retrieved successfully',
      data: result,
    });
  });

  addTransaction = asyncHandler(async (req, res) => {
    const result = await cashboxPersonAccountServices.addTransaction(req.body, req.user._id);
    await logActivity({
      userId: req.user._id,
      action: 'CREATE',
      module: 'cashboxPersonAccount',
      recordId: result.account._id.toString(),
    });
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.CREATED,
      message: 'Person account transaction recorded successfully!',
      data: result.account,
    });
  });
}

export default new CashboxPersonAccountControllers();

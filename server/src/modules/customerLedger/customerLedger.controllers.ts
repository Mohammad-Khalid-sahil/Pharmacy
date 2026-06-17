import httpStatus from 'http-status';
import asyncHandler from '../../lib/asyncHandler';
import sendResponse from '../../lib/sendResponse';
import paginationMeta from '../../lib/paginationMeta';
import customerLedgerServices from './customerLedger.services';

class CustomerLedgerControllers {
  readAll = asyncHandler(async (req, res) => {
    const result = await customerLedgerServices.readAll(req.query, req.user._id);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'Customer ledger retrieved successfully',
      meta: paginationMeta(req.query, result.totalCount),
      data: result.data
    });
  });
}

export default new CustomerLedgerControllers();

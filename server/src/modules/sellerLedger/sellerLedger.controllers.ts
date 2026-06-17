import httpStatus from 'http-status';
import asyncHandler from '../../lib/asyncHandler';
import sendResponse from '../../lib/sendResponse';
import paginationMeta from '../../lib/paginationMeta';
import sellerLedgerServices from './sellerLedger.services';

class SellerLedgerControllers {
  readAll = asyncHandler(async (req, res) => {
    const result = await sellerLedgerServices.readAll(req.query, req.user._id);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'Seller ledger retrieved successfully',
      meta: paginationMeta(req.query, result.totalCount),
      data: result.data
    });
  });

  getBalance = asyncHandler(async (req, res) => {
    const result = await sellerLedgerServices.getBalance(req.params.sellerId, req.user._id);
    sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'Seller balance retrieved successfully!', data: result });
  });
}

export default new SellerLedgerControllers();

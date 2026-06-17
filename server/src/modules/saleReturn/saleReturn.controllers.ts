import httpStatus from 'http-status';
import asyncHandler from '../../lib/asyncHandler';
import sendResponse from '../../lib/sendResponse';
import paginationMeta from '../../lib/paginationMeta';
import saleReturnServices from './saleReturn.services';

class SaleReturnControllers {
  create = asyncHandler(async (req, res) => {
    const result = await saleReturnServices.create(req.body, req.user._id);
    sendResponse(res, { success: true, statusCode: httpStatus.CREATED, message: 'Sale return recorded successfully!', data: result });
  });

  readAll = asyncHandler(async (req, res) => {
    const result = await saleReturnServices.readAll(req.query, req.user._id);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'Sale returns retrieved successfully',
      meta: paginationMeta(req.query, result.totalCount),
      data: result.data
    });
  });

  readSingle = asyncHandler(async (req, res) => {
    const result = await saleReturnServices.read(req.params.id, req.user._id);
    sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'Sale return fetched successfully!', data: result });
  });
}

export default new SaleReturnControllers();

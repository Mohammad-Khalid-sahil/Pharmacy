import httpStatus from 'http-status';
import asyncHandler from '../../lib/asyncHandler';
import sendResponse from '../../lib/sendResponse';
import paginationMeta from '../../lib/paginationMeta';
import salaryPaymentServices from './salaryPayment.services';

class SalaryPaymentControllers {
  create = asyncHandler(async (req, res) => {
    const result = await salaryPaymentServices.create(req.body, req.user._id);
    sendResponse(res, { success: true, statusCode: httpStatus.CREATED, message: 'Salary payment recorded successfully!', data: result });
  });

  readAll = asyncHandler(async (req, res) => {
    const result = await salaryPaymentServices.readAll(req.query, req.user._id);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'Salary payments retrieved successfully',
      meta: paginationMeta(req.query, result.totalCount),
      data: result.data
    });
  });
}

export default new SalaryPaymentControllers();

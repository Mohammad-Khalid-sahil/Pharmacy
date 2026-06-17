import httpStatus from 'http-status';
import asyncHandler from '../../lib/asyncHandler';
import sendResponse from '../../lib/sendResponse';
import paginationMeta from '../../lib/paginationMeta';
import logActivity from '../../lib/logActivity';
import customerDebtorAccountServices from './customerDebtorAccount.services';

class CustomerDebtorAccountControllers {
  readAll = asyncHandler(async (req, res) => {
    const result = await customerDebtorAccountServices.readAll(req.query, req.user._id);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'Customer debtor accounts retrieved successfully',
      meta: paginationMeta(req.query, result.totalCount),
      data: result.data,
    });
  });

  readSingle = asyncHandler(async (req, res) => {
    const result = await customerDebtorAccountServices.read(req.params.id, req.user._id);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'Customer debtor account retrieved successfully',
      data: result,
    });
  });

  addDebt = asyncHandler(async (req, res) => {
    const result = await customerDebtorAccountServices.addDebt(req.body, req.user._id);
    await logActivity({
      userId: req.user._id,
      action: 'CREATE',
      module: 'customerDebtorAccount',
      recordId: result._id.toString(),
    });
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.CREATED,
      message: 'Customer debt recorded successfully!',
      data: result,
    });
  });

  settle = asyncHandler(async (req, res) => {
    const result = await customerDebtorAccountServices.settle(req.params.id, req.user._id);
    await logActivity({
      userId: req.user._id,
      action: 'UPDATE',
      module: 'customerDebtorAccount',
      recordId: result._id.toString(),
    });
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'Debtor account settled successfully!',
      data: result,
    });
  });
}

export default new CustomerDebtorAccountControllers();

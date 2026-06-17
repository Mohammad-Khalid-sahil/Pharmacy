import httpStatus from 'http-status';
import asyncHandler from '../../lib/asyncHandler';
import sendResponse from '../../lib/sendResponse';
import expenseServices from './expense.services';

class ExpenseController {
  private services = expenseServices;

  create = asyncHandler(async (req, res) => {
    const result = await this.services.create(req.body, req.user._id);
    sendResponse(res, { success: true, statusCode: httpStatus.CREATED, message: 'Expense created successfully!', data: result });
  });

  getAll = asyncHandler(async (req, res) => {
    const result = await this.services.getAll(req.user._id, req.query);
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'Expenses retrieved successfully!',
      meta: { page, limit, total: result.totalCount, totalPage: Math.ceil(result.totalCount / limit) },
      data: result.data,
      summary: result.summary
    });
  });

  update = asyncHandler(async (req, res) => {
    const result = await this.services.updateExpense(req.params.id, req.body, req.user._id);
    sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'Expense updated successfully!', data: result });
  });

  delete = asyncHandler(async (req, res) => {
    await this.services.deleteExpense(req.params.id, req.user._id);
    sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'Expense deleted successfully!' });
  });
}

const expenseController = new ExpenseController();
export default expenseController;

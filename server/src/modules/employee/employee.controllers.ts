import httpStatus from 'http-status';
import asyncHandler from '../../lib/asyncHandler';
import sendResponse from '../../lib/sendResponse';
import paginationMeta from '../../lib/paginationMeta';
import employeeServices from './employee.services';

class EmployeeControllers {
  create = asyncHandler(async (req, res) => {
    const result = await employeeServices.create(req.body, req.user._id);
    sendResponse(res, { success: true, statusCode: httpStatus.CREATED, message: 'Employee created successfully!', data: result });
  });

  readAll = asyncHandler(async (req, res) => {
    const result = await employeeServices.readAll(req.query, req.user._id);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'Employees retrieved successfully',
      meta: paginationMeta(req.query, result.totalCount),
      data: result.data
    });
  });

  readSingle = asyncHandler(async (req, res) => {
    const result = await employeeServices.read(req.params.id, req.user._id);
    sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'Employee fetched successfully!', data: result });
  });

  update = asyncHandler(async (req, res) => {
    const result = await employeeServices.update(req.params.id, req.body, req.user._id);
    sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'Employee updated successfully!', data: result });
  });

  delete = asyncHandler(async (req, res) => {
    await employeeServices.delete(req.params.id, req.user._id);
    sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'Employee deleted successfully!' });
  });
}

export default new EmployeeControllers();

import httpStatus from 'http-status';
import asyncHandler from '../../lib/asyncHandler';
import sendResponse from '../../lib/sendResponse';
import paginationMeta from '../../lib/paginationMeta';
import prescriptionServices from './prescription.services';

class PrescriptionControllers {
  create = asyncHandler(async (req, res) => {
    const result = await prescriptionServices.create(req.body, req.user._id);
    sendResponse(res, { success: true, statusCode: httpStatus.CREATED, message: 'Prescription created successfully!', data: result });
  });

  readAll = asyncHandler(async (req, res) => {
    const result = await prescriptionServices.readAll(req.query, req.user._id);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'Prescriptions retrieved successfully',
      meta: paginationMeta(req.query, result.totalCount),
      data: result.data
    });
  });

  readSingle = asyncHandler(async (req, res) => {
    const result = await prescriptionServices.read(req.params.id, req.user._id);
    sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'Prescription fetched successfully!', data: result });
  });

  delete = asyncHandler(async (req, res) => {
    await prescriptionServices.delete(req.params.id, req.user._id);
    sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'Prescription deleted successfully!' });
  });
}

export default new PrescriptionControllers();

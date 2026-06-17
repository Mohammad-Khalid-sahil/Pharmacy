import { RequestHandler } from 'express';
import httpStatus from 'http-status';
import CustomError from '../errors/customError';
import { TUserRole } from '../constant/userRole';

const verifyRole = (...roles: TUserRole[]): RequestHandler => {
  return (req, _res, next) => {
    if (!req.user?.role || !roles.includes(req.user.role as TUserRole)) {
      throw new CustomError(httpStatus.FORBIDDEN, 'You do not have permission for this action', 'Forbidden');
    }
    next();
  };
};

export default verifyRole;

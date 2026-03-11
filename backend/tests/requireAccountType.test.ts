import { Request, Response } from 'express';
import {
  requireAccountType,
  requireAccountTypeWithStatuses,
  requirePasswordChanged,
  requireTrustedClaims,
} from '../src/middleware/requireAccountType.js';
import { AppError } from '../src/lib/AppError.js';

const createReq = (overrides: Partial<Request> = {}): Request => {
  return {
    user: {
      id: 'u1',
      account_type: 'doctor',
      account_status: 'pending',
      must_change_password: false,
    },
    ...overrides,
  } as Request;
};

const res = {} as Response;

describe('requireAccountType middleware', () => {
  it('requireTrustedClaims allows valid claims', () => {
    const req = createReq();
    const next = jest.fn();

    requireTrustedClaims(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('requireAccountType blocks pending for active-only routes', () => {
    const req = createReq({
      user: {
        id: 'u1',
        account_type: 'doctor',
        account_status: 'pending',
        must_change_password: false,
      },
    });
    const next = jest.fn();

    requireAccountType('doctor')(req, res, next);

    const firstArg = next.mock.calls[0]?.[0] as AppError;
    expect(firstArg).toBeInstanceOf(AppError);
    expect(firstArg.statusCode).toBe(403);
  });

  it('requireAccountTypeWithStatuses allows pending doctor for onboarding', () => {
    const req = createReq({
      user: {
        id: 'u1',
        account_type: 'doctor',
        account_status: 'pending',
        must_change_password: false,
      },
    });
    const next = jest.fn();

    requireAccountTypeWithStatuses(['doctor', 'pharmacist'], ['pending', 'active'])(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('requireAccountTypeWithStatuses blocks rejected account', () => {
    const req = createReq({
      user: {
        id: 'u1',
        account_type: 'doctor',
        account_status: 'rejected',
        must_change_password: false,
      },
    });
    const next = jest.fn();

    requireAccountTypeWithStatuses(['doctor', 'pharmacist'], ['pending', 'active'])(req, res, next);

    const firstArg = next.mock.calls[0]?.[0] as AppError;
    expect(firstArg).toBeInstanceOf(AppError);
    expect(firstArg.statusCode).toBe(403);
  });

  it('requirePasswordChanged blocks users flagged for password reset', () => {
    const req = createReq({
      user: {
        id: 'u1',
        account_type: 'doctor',
        account_status: 'active',
        must_change_password: true,
      },
    });
    const next = jest.fn();

    requirePasswordChanged(req, res, next);

    const firstArg = next.mock.calls[0]?.[0] as AppError;
    expect(firstArg).toBeInstanceOf(AppError);
    expect(firstArg.statusCode).toBe(403);
  });
});

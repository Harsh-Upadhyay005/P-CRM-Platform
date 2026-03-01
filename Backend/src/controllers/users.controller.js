import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import * as service from "../services/users.service.js";

export const getMe = asyncHandler(async (req, res) => {
  const user = await service.getMe(req.user);
  res.json(new ApiResponse(200, user, "Profile retrieved"));
});

export const listUsers = asyncHandler(async (req, res) => {
  const result = await service.listUsers(req.query, req.user);
  res.json(new ApiResponse(200, result, "Users retrieved"));
});

export const getUserById = asyncHandler(async (req, res) => {
  const user = await service.getUserById(req.params.id, req.user);
  res.json(new ApiResponse(200, user, "User retrieved"));
});

export const updateMyProfile = asyncHandler(async (req, res) => {
  const user = await service.updateMyProfile(req.user.userId, req.body, req.user);
  res.json(new ApiResponse(200, user, "Profile updated"));
});

export const assignRole = asyncHandler(async (req, res) => {
  const user = await service.assignRole(req.params.id, req.body, req.user);
  res.json(new ApiResponse(200, user, "Role assigned"));
});

export const setUserActiveStatus = asyncHandler(async (req, res) => {
  const user = await service.setUserActiveStatus(req.params.id, req.body, req.user);
  res.json(new ApiResponse(200, user, "User status updated"));
});

export const deleteUser = asyncHandler(async (req, res) => {
  await service.softDeleteUser(req.params.id, req.user);
  res.json(new ApiResponse(200, null, "User deleted"));
});

export const changePassword = asyncHandler(async (req, res) => {
  await service.changePassword(req.user.userId, req.body, req.user);
  res.json(new ApiResponse(200, null, "Password changed successfully"));
});

export const createUser = asyncHandler(async (req, res) => {
  const user = await service.createUser(req.body, req.user);
  res.status(201).json(new ApiResponse(201, user, "User created successfully"));
});

import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import * as service from "../services/complaints.service.js";

export const createComplaint = asyncHandler(async (req, res) => {
  const complaint = await service.createComplaint(req.body, req.user);
  res.status(201).json(new ApiResponse(201, complaint, "Complaint registered successfully"));
});

export const listComplaints = asyncHandler(async (req, res) => {
  const result = await service.listComplaints(req.query, req.user);
  res.json(new ApiResponse(200, result, "Complaints retrieved"));
});

export const getComplaint = asyncHandler(async (req, res) => {
  const complaint = await service.getComplaint(req.params.id, req.user);
  res.json(new ApiResponse(200, complaint, "Complaint retrieved"));
});

export const trackComplaint = asyncHandler(async (req, res) => {
  const complaint = await service.getComplaintByTrackingId(req.params.trackingId);
  res.json(new ApiResponse(200, complaint, "Complaint status retrieved"));
});

export const updateComplaint = asyncHandler(async (req, res) => {
  const complaint = await service.updateComplaint(req.params.id, req.body, req.user);
  res.json(new ApiResponse(200, complaint, "Complaint updated"));
});

export const assignComplaint = asyncHandler(async (req, res) => {
  const complaint = await service.assignComplaint(req.params.id, req.body, req.user);
  res.json(new ApiResponse(200, complaint, "Complaint assigned"));
});

export const updateComplaintStatus = asyncHandler(async (req, res) => {
  const complaint = await service.updateComplaintStatus(req.params.id, req.body, req.user);
  res.json(new ApiResponse(200, complaint, "Status updated"));
});

export const deleteComplaint = asyncHandler(async (req, res) => {
  await service.softDeleteComplaint(req.params.id, req.user);
  res.json(new ApiResponse(200, null, "Complaint deleted"));
});

export const addNote = asyncHandler(async (req, res) => {
  const note = await service.addInternalNote(req.params.id, req.body, req.user);
  res.status(201).json(new ApiResponse(201, note, "Note added"));
});

export const getNotes = asyncHandler(async (req, res) => {
  const notes = await service.getInternalNotes(req.params.id, req.user);
  res.json(new ApiResponse(200, notes, "Notes retrieved"));
});

// ── PUBLIC / CITIZEN ENDPOINTS ────────────────────────────────────────────

export const createPublicComplaint = asyncHandler(async (req, res) => {
  const complaint = await service.createPublicComplaint(req.body);
  res.status(201).json(new ApiResponse(201, complaint, "Complaint registered. Check your email for your Tracking ID."));
});

export const submitFeedback = asyncHandler(async (req, res) => {
  const feedback = await service.submitFeedback(req.params.trackingId, req.body);
  res.status(201).json(new ApiResponse(201, feedback, "Feedback submitted successfully"));
});

export const getFeedback = asyncHandler(async (req, res) => {
  const feedback = await service.getFeedback(req.params.id, req.user);
  res.json(new ApiResponse(200, feedback, "Feedback retrieved"));
});

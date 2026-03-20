const mongoose = require('mongoose');

const JOB_STATUSES = ['pending', 'queued', 'running', 'completed', 'failed', 'retrying'];
const JOB_TYPES = ['http_request', 'email', 'data_cleanup', 'report_generation', 'custom_script'];

const jobRunSchema = new mongoose.Schema(
  {
    startedAt: Date,
    completedAt: Date,
    status: { type: String, enum: ['success', 'failure'] },
    output: mongoose.Schema.Types.Mixed,
    error: String,
    duration: Number, // ms
  },
  { _id: false }
);

const jobSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Job name is required'],
      trim: true,
      maxlength: 200,
    },
    description: { type: String, trim: true },
    type: {
      type: String,
      enum: JOB_TYPES,
      required: [true, 'Job type is required'],
    },
    cronExpression: {
      type: String,
      required: [true, 'CRON expression is required'],
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      enum: JOB_STATUSES,
      default: 'pending',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    maxRetries: {
      type: Number,
      default: 3,
      min: 0,
      max: 10,
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    lastRunAt: Date,
    nextRunAt: Date,
    runs: {
      type: [jobRunSchema],
      default: [],
    },
    tags: [String],
  },
  { timestamps: true }
);

jobSchema.index({ status: 1, isActive: 1 });
jobSchema.index({ nextRunAt: 1 });
jobSchema.index({ tags: 1 });

const Job = mongoose.model('Job', jobSchema);

module.exports = { Job, JOB_STATUSES, JOB_TYPES };

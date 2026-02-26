/**
 * Compliance API Routes — Standards compliance monitoring and reporting
 * Provides REST endpoints for compliance checking and reporting
 */

import express from 'express';
import { StandardsComplianceService, ComplianceReport } from '../../services/standardsComplianceService';

const router = express.Router();

/**
 * GET /v1/compliance/audit
 * Run full compliance audit
 */
router.post('/audit', async (_req, res) => {
  try {
    const report: ComplianceReport = await StandardsComplianceService.runFullAudit();

    res.json({
      success: true,
      data: report,
      meta: {
        generatedAt: report.generatedAt,
        version: '1.0.0',
        standards: ['WCAG 2.1 AA', 'OWASP Top 10 2021', 'GDPR', 'Core Web Vitals']
      }
    });
  } catch (error) {
    console.error('Compliance audit error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to run compliance audit',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /v1/compliance/checks
 * Get available compliance checks
 */
router.get('/checks', (_req, res) => {
  try {
    const checks = StandardsComplianceService.getAvailableChecks();

    res.json({
      success: true,
      data: checks,
      meta: {
        total: checks.length,
        categories: ['accessibility', 'security', 'performance', 'privacy']
      }
    });
  } catch (error) {
    console.error('Get checks error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve compliance checks'
    });
  }
});

/**
 * GET /v1/compliance/checks/:category
 * Get checks by category
 */
router.get('/checks/:category', (req, res) => {
  try {
    const { category } = req.params;
    const checks = StandardsComplianceService.getChecksByCategory(category);

    res.json({
      success: true,
      data: checks,
      meta: {
        category,
        total: checks.length
      }
    });
  } catch (error) {
    console.error('Get category checks error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve category checks'
    });
  }
});

/**
 * POST /v1/compliance/check/:checkId
 * Run specific compliance check
 */
router.post('/check/:checkId', async (req, res) => {
  try {
    const { checkId } = req.params;
    const result = await StandardsComplianceService.runCheck(checkId);

    res.json({
      success: true,
      data: result,
      meta: {
        checkId,
        executedAt: new Date()
      }
    });
  } catch (error) {
    console.error('Run check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to run compliance check',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /v1/compliance/summary
 * Get compliance summary (cached results)
 */
router.get('/summary', async (_req, res) => {
  try {
    // In production, this would return cached results
    // For now, run a quick audit
    const report: ComplianceReport = await StandardsComplianceService.runFullAudit();

    const summary = {
      overallScore: report.overallScore,
      categoryScores: report.categoryScores,
      status: report.overallScore >= 90 ? 'excellent' :
              report.overallScore >= 70 ? 'good' :
              report.overallScore >= 50 ? 'needs-improvement' : 'critical',
      lastAudit: report.generatedAt,
      criticalIssues: report.summary.criticalIssues,
      totalChecks: report.summary.totalChecks,
      compliantChecks: report.summary.compliant,
      trends: {
        // In production, this would show historical data
        previousScore: 88,
        change: report.overallScore - 88
      }
    };

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Get summary error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve compliance summary'
    });
  }
});

/**
 * GET /v1/compliance/export
 * Export compliance report in various formats
 */
router.get('/export', async (req, res) => {
  try {
    const { format = 'json' } = req.query;

    const report: ComplianceReport = await StandardsComplianceService.runFullAudit();

    switch (format) {
      case 'json':
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="compliance-report-${new Date().toISOString().split('T')[0]}.json"`);
        res.json(report);
        break;

      case 'csv': {
        // Convert to CSV format
        const csvData = convertToCSV(report);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="compliance-report-${new Date().toISOString().split('T')[0]}.csv"`);
        res.send(csvData);
        break;
      }

      default:
        res.status(400).json({
          success: false,
          error: 'Unsupported export format',
          supportedFormats: ['json', 'csv']
        });
    }
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export compliance report'
    });
  }
});

/**
 * POST /v1/compliance/webhook
 * Webhook for external compliance monitoring services
 */
router.post('/webhook', (req, res) => {
  try {
    const { source, data } = req.body;

    // Verify webhook signature (in production)
    // Process external compliance data
    console.log(`Received compliance webhook from ${source}:`, data);

    res.json({
      success: true,
      message: 'Webhook received successfully',
      processedAt: new Date()
    });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process webhook'
    });
  }
});

/**
 * Helper function to convert compliance report to CSV
 */
function convertToCSV(report: ComplianceReport): string {
  const headers = [
    'Check ID',
    'Category',
    'Standard',
    'Status',
    'Score',
    'Issues Count',
    'Critical Issues',
    'Timestamp'
  ];

  const rows = report.checks.map((check: { checkId: string; status: string; score: number; issues: Array<{ severity: string }>; timestamp: Date }) => [
    check.checkId,
    // Get category from check service (simplified)
    'unknown',
    'unknown',
    check.status,
    check.score.toString(),
    check.issues.length.toString(),
    check.issues.filter(i => i.severity === 'high').length.toString(),
    check.timestamp.toISOString()
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  return csvContent;
}

export default router;

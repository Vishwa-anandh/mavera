import { describe, expect, it } from 'vitest';
import { awsServiceCategoryOf, resourceTypeShares } from './awsDerivations';

describe('awsServiceCategoryOf', () => {
  it.each([
    ['Amazon EC2', 'Compute'],
    ['Amazon Elastic Compute Cloud - Compute', 'Compute'],
    ['AWS Lambda', 'Compute'],
    ['Amazon RDS', 'Databases'],
    ['Amazon DynamoDB', 'Databases'],
    ['Amazon S3', 'Storage'],
    ['Amazon Simple Storage Service', 'Storage'],
    ['Amazon CloudFront', 'Networking and delivery'],
    ['Amazon VPC', 'Networking and delivery'],
    ['Amazon Route 53', 'Networking and delivery'],
    ['AWS WAF', 'Security'],
    ['Amazon GuardDuty', 'Security'],
    ['AWS Support (Business)', 'Support and billing'],
    ['Tax', 'Support and billing'],
    ['AWS Budgets', 'Support and billing'],
    ['CodeBuild', 'Management and developer tools'],
    ['AmazonCloudWatch', 'Management and developer tools'],
    ['Something New', 'Other'],
  ])('puts %s under %s', (service, category) => {
    expect(awsServiceCategoryOf(service)).toBe(category);
  });
});

describe('resourceTypeShares', () => {
  const byType = [
    { type: 'Subnets', count: 40, icon: 'layers' },
    { type: 'Security Groups', count: 60, icon: 'shield' },
    { type: 'Lambda Functions', count: 1, icon: 'zap' },
  ];

  it('sorts the biggest type first and gives each its share of all resources', () => {
    const shares = resourceTypeShares(byType);
    expect(shares.map((s) => [s.type, s.count])).toEqual([['Security Groups', 60], ['Subnets', 40], ['Lambda Functions', 1]]);
    expect(shares.map((s) => s.sharePct)).toEqual([59.4, 39.6, 1]);
  });

  it('adds up to exactly 100 percent', () => {
    const shares = resourceTypeShares([{ type: 'A', count: 1, icon: '' }, { type: 'B', count: 1, icon: '' }, { type: 'C', count: 1, icon: '' }]);
    expect(shares.reduce((sum, s) => sum + s.sharePct, 0)).toBeCloseTo(100, 10);
  });

  it('does not change the input order and copes with an empty inventory', () => {
    resourceTypeShares(byType);
    expect(byType[0].type).toBe('Subnets');
    expect(resourceTypeShares([])).toEqual([]);
  });
});

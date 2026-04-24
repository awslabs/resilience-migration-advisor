// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
/**
 * AWS RMA — Resilience Migration Advisor — scripts.js
 * Cloudscape-styled wizard + rules engine + full runbook generator
 * 
 * EDIT POINTS:
 * - WIZARD_STEPS: add/edit wizard questions (line ~25)
 * - RULES_ENGINE: edit decision logic (search "RULES_ENGINE")
 * - RUNBOOK_TEMPLATES: edit runbook step templates (inside getRunbookSteps)
 * - COMMAND_TEMPLATES: edit CLI command blocks (inside getCommandBlocks)
 * - REFERENCE_LIBRARY: edit reference content (inside getReferenceLibrary)
 * - IMMEDIATE_DR: edit accelerated recovery mode runbook (inside getRunbookSteps)
 *
 * NEW DIMENSIONS (v2):
 * - appType: ec2 | containers | serverless | mixed
 * - landingZone: control-tower | custom-lz | single-account
 * - rpo: near-zero | lt-15m | lt-1h | lt-24h | gt-24h
 * - dbTypes[]: multi-select array of DB types
 * - networkTopology: single-vpc | multi-vpc-tgw | hub-spoke | hybrid | multi-region
 * - urgencyMode: architecture-strategy | immediate-dr (displayed as "Accelerated Recovery")
 */

(function () {
  'use strict';

  // ============================================================
  // REGIONAL_PARTNERS — MENA-region AWS partner data
  // These partners support resilience and migration workloads
  // across the MENA region. Some partners hold verified AWS
  // Competencies (noted in their expertise arrays). All partners
  // are AWS Partners with experience in DR and migration.
  // NOTE: Partner capabilities described based on public information
  // and AWS Marketplace listings where available. Verify directly
  // with partners for current capabilities and pricing.
  // AWS Marketplace links verified March 2026.
  // ============================================================
  var REGIONAL_PARTNERS = {
    bestcloudfor_me: {
      fullName: 'BestCloudForMe',
      website: 'https://bestcloudfor.me',
      marketplace: null,
      focus: 'Cloud migration, managed services, DevOps, and AWS optimization',
      region: 'Turkey, UAE, MENA',
      expertise: ['Cloud Migration', 'Managed Services', 'DevOps', 'AWS Optimization'],
      specialization: 'Migration & modernization',
      drCapability: 'Full DR planning and execution with cross-region failover',
      managedServices: 'Yes — managed cloud operations',
      industries: 'Telecom, Insurance, Retail, Enterprise',
      pros: [
        'First and only AWS Premier Tier Partner from Türkiye with 2 AWS Competencies',
        '50+ AWS Certifications and participation in 6 AWS Partner Programs',
        'Proven enterprise clients including Vodafone Turkey, Aegon, and BSH'
      ],
      cons: [
        'No AWS Marketplace listing for consolidated billing',
        'Primarily focused on Turkey and MENA — limited presence outside the region'
      ],
      engagementSteps: [
        {
          step: 'Initial Discovery and Assessment',
          detail: 'BestCloudForMe conducts a comprehensive discovery of your current AWS environment, workloads, and DR requirements. They map dependencies and identify critical recovery targets.',
          cmd: 'aws ec2 describe-instances --query "Reservations[].Instances[].{ID:InstanceId,Type:InstanceType,State:State.Name,AZ:Placement.AvailabilityZone}" --output table',
          validation: ['Inventory of all running workloads documented', 'RTO/RPO targets defined for each tier']
        },
        {
          step: 'Architecture Review',
          detail: 'Review existing architecture against AWS Well-Architected Reliability pillar. Identify single points of failure and gaps in current DR posture.',
          cmd: 'aws wellarchitected list-workloads --output table',
          validation: ['Well-Architected review completed', 'Gap analysis documented']
        },
        {
          step: 'Target Region Architecture Design',
          detail: 'Design the target region architecture including VPC layout, subnet strategy, security groups, and IAM policies for the recovery region.',
          cmd: 'aws ec2 describe-vpcs --query "Vpcs[].{ID:VpcId,CIDR:CidrBlock,State:State}" --output table',
          validation: ['Target region VPC design approved', 'Network CIDR ranges confirmed non-overlapping']
        },
        {
          step: 'Infrastructure Provisioning',
          detail: 'Provision the target region infrastructure using IaC templates. Deploy networking, compute, and storage resources in the recovery region.',
          cmd: 'aws cloudformation deploy --template-file dr-stack.yaml --stack-name dr-infra --region me-south-1',
          validation: ['CloudFormation stacks deployed successfully', 'Security groups and NACLs verified']
        },
        {
          step: 'Data Replication or Migration',
          detail: 'Configure cross-region data replication for databases, S3 buckets, and EBS volumes. Set up AWS DMS for database migration if needed.',
          cmd: 'aws s3api get-bucket-replication --bucket my-primary-bucket',
          validation: ['S3 cross-region replication active', 'RDS read replicas or DMS tasks running']
        },
        {
          step: 'Validation and Cutover',
          detail: 'Execute DR drill to validate recovery procedures. Test failover, verify data integrity, and confirm RTO/RPO targets are met.',
          cmd: 'aws ec2 describe-instances --region me-south-1 --query "Reservations[].Instances[].{ID:InstanceId,State:State.Name}" --output table',
          validation: ['DR drill completed successfully', 'RTO/RPO targets validated', 'Runbook documented and approved']
        }
      ]
    },
    integra: {
      fullName: 'Integra Technologies',
      website: 'https://integratech.ae',
      marketplace: null,
      focus: 'Enterprise cloud transformation and infrastructure modernization',
      region: 'Saudi Arabia, UAE, MENA',
      expertise: ['Infrastructure Modernization', 'Networking & Transit Gateway', 'DevOps'],
      specialization: 'Infrastructure modernization & networking',
      drCapability: 'Multi-VPC DR architecture with Transit Gateway expertise',
      managedServices: 'Yes — infrastructure management and monitoring',
      industries: 'Telecom, Finance, Government',
      pros: [
        'Deep expertise in complex multi-VPC and hybrid network architectures',
        'Strong presence in Saudi Arabia with government sector experience',
        'Specializes in Transit Gateway and Direct Connect configurations'
      ],
      cons: [
        'No AWS Marketplace listing currently available',
        'Primarily infrastructure-focused — may need additional partners for application-layer DR'
      ],
      engagementSteps: [
        {
          step: 'Initial Discovery and Assessment',
          detail: 'Integra performs a network-centric discovery of your environment, mapping VPCs, Transit Gateways, Direct Connect links, and inter-region connectivity.',
          cmd: 'aws ec2 describe-transit-gateways --output table',
          validation: ['Network topology fully mapped', 'Transit Gateway route tables documented']
        },
        {
          step: 'Architecture Review',
          detail: 'Review network architecture for DR readiness. Assess routing, failover paths, and DNS configuration for multi-region resilience.',
          cmd: 'aws route53 list-hosted-zones --output table',
          validation: ['DNS failover configuration reviewed', 'Network path redundancy confirmed']
        },
        {
          step: 'Target Region Architecture Design',
          detail: 'Design target region network architecture with matching VPC structure, Transit Gateway peering, and security group mirroring.',
          cmd: 'aws ec2 describe-transit-gateway-peering-attachments --output table',
          validation: ['Target region network design approved', 'IP addressing scheme finalized']
        },
        {
          step: 'Infrastructure Provisioning',
          detail: 'Deploy network infrastructure in the target region including VPCs, subnets, Transit Gateway attachments, and VPN connections.',
          cmd: 'aws ec2 create-transit-gateway-peering-attachment --transit-gateway-id tgw-source --peer-transit-gateway-id tgw-target --peer-region me-south-1',
          validation: ['Transit Gateway peering established', 'VPN tunnels active and routing verified']
        },
        {
          step: 'Data Replication or Migration',
          detail: 'Configure data replication across regions using AWS-native tools. Set up RDS cross-region replicas and S3 replication rules.',
          cmd: 'aws rds create-db-instance-read-replica --db-instance-identifier mydb-replica --source-db-instance-identifier mydb --region me-south-1',
          validation: ['Database replicas synchronized', 'Replication lag within acceptable thresholds']
        },
        {
          step: 'Validation and Cutover',
          detail: 'Execute network failover test. Validate Transit Gateway routing, DNS failover, and end-to-end connectivity in the target region.',
          cmd: 'aws ec2 describe-transit-gateway-route-tables --region me-south-1 --output table',
          validation: ['Network failover test passed', 'End-to-end connectivity verified', 'Failover runbook finalized']
        }
      ]
    },
    sudo: {
      fullName: 'Sudo Consultants',
      website: 'https://sudoconsultants.com',
      marketplace: 'https://aws.amazon.com/marketplace/seller-profile?id=06bb5afe-a59e-4377-b6a5-935b81fedb3c',
      focus: 'Cloud consulting, DevOps, and partner-led migration services',
      region: 'UAE, Saudi Arabia, Bahrain, MENA',
      expertise: ['Partner-led Migration', 'DevOps & CI/CD', 'Well-Architected Reviews'],
      specialization: 'Partner-led migration & DevOps',
      drCapability: 'Partner-led DR planning with hands-on migration execution',
      managedServices: 'Yes — SUDO Shield managed cloud with 24/7 operations and monitoring',
      industries: 'Enterprise, Startups, Public Sector',
      pros: [
        'AWS Premier Tier Partner with DevOps Competency and Strategic Collaboration Agreement with AWS',
        'ISO 27001 certified with 150+ AWS certifications',
        'AWS MSP Program member with 24/7 managed cloud operations (SUDO Shield)'
      ],
      cons: [
        'Consulting model may require longer engagement timelines',
        'Smaller team compared to large system integrators'
      ],
      engagementSteps: [
        {
          step: 'Initial Discovery and Assessment',
          detail: 'Sudo Consultants assigns a dedicated team to assess your current environment, document workloads, and define DR objectives and success criteria.',
          cmd: 'aws configservice describe-configuration-recorders --output table',
          validation: ['Environment assessment report delivered', 'DR objectives and success criteria agreed']
        },
        {
          step: 'Architecture Review',
          detail: 'Conduct AWS Well-Architected review focused on reliability and operational excellence pillars. Identify improvement opportunities.',
          cmd: 'aws wellarchitected get-workload --workload-id YOUR_WORKLOAD_ID --output json',
          validation: ['Well-Architected review findings documented', 'Remediation priorities ranked']
        },
        {
          step: 'Target Region Architecture Design',
          detail: 'Collaboratively design the target region architecture with your team. Include IaC templates, CI/CD pipelines, and automated testing.',
          cmd: 'aws cloudformation validate-template --template-body file://dr-template.yaml',
          validation: ['Architecture design document approved', 'IaC templates peer-reviewed']
        },
        {
          step: 'Infrastructure Provisioning',
          detail: 'Deploy infrastructure using CI/CD pipelines. Sudo team manages the provisioning with automated rollback capabilities.',
          cmd: 'aws cloudformation create-stack --stack-name dr-environment --template-body file://dr-template.yaml --region me-south-1 --capabilities CAPABILITY_IAM',
          validation: ['Infrastructure deployed via CI/CD pipeline', 'Automated rollback tested']
        },
        {
          step: 'Data Replication or Migration',
          detail: 'Set up data migration using AWS DMS for databases and S3 cross-region replication. Configure ongoing sync for stateful workloads.',
          cmd: 'aws dms describe-replication-tasks --output table',
          validation: ['DMS replication tasks running', 'Data consistency checks passed']
        },
        {
          step: 'Validation and Cutover',
          detail: 'Execute full DR drill with Sudo team on-hand. Validate all recovery procedures, document lessons learned, and hand over runbook.',
          cmd: 'aws ec2 describe-instances --region me-south-1 --filters "Name=tag:Environment,Values=DR" --output table',
          validation: ['DR drill executed successfully', 'Runbook handed over to operations team', 'Knowledge transfer completed']
        }
      ]
    },
    zaintech: {
      fullName: 'ZainTech',
      website: 'https://zaintech.com',
      marketplace: null,
      focus: 'Digital transformation, cloud infrastructure, and managed ICT services',
      region: 'Kuwait, Saudi Arabia, Bahrain, Jordan, Iraq, MENA',
      expertise: ['Managed ICT Services', 'Digital Transformation', 'Hybrid Connectivity'],
      specialization: 'Managed ICT & digital transformation',
      drCapability: 'Enterprise-grade DR with managed infrastructure services',
      managedServices: 'Yes — full managed ICT and cloud services',
      industries: 'Telecom, Government, Enterprise, Oil & Gas',
      pros: [
        'Broad MENA presence across multiple countries',
        'Backed by Zain Group — strong telecom and enterprise relationships',
        'Full managed ICT services including network, security, and cloud'
      ],
      cons: [
        'Large organization — engagement may involve longer procurement cycles',
        'Telecom heritage may mean less specialization in pure cloud-native architectures'
      ],
      engagementSteps: [
        {
          step: 'Initial Discovery and Assessment',
          detail: 'ZainTech conducts an enterprise-wide assessment covering cloud infrastructure, network connectivity, and ICT dependencies across your MENA operations.',
          cmd: 'aws organizations describe-organization --output json',
          validation: ['Enterprise assessment report completed', 'ICT dependency map created']
        },
        {
          step: 'Architecture Review',
          detail: 'Review existing cloud and on-premises architecture. Assess hybrid connectivity, Direct Connect links, and multi-region readiness.',
          cmd: 'aws directconnect describe-connections --output table',
          validation: ['Hybrid architecture documented', 'Direct Connect capacity assessed']
        },
        {
          step: 'Target Region Architecture Design',
          detail: 'Design enterprise-grade target region architecture with managed services integration, monitoring, and automated alerting.',
          cmd: 'aws cloudwatch describe-alarms --state-value ALARM --output table',
          validation: ['Target architecture design approved', 'Monitoring and alerting strategy defined']
        },
        {
          step: 'Infrastructure Provisioning',
          detail: 'Provision target region infrastructure with ZainTech managed services overlay. Deploy compute, storage, networking, and security controls.',
          cmd: 'aws ec2 describe-availability-zones --region me-south-1 --output table',
          validation: ['Infrastructure provisioned in target region', 'Managed services monitoring active']
        },
        {
          step: 'Data Replication or Migration',
          detail: 'Configure enterprise data replication strategy. Set up cross-region replication for critical databases, object storage, and file systems.',
          cmd: 'aws efs describe-replication-configurations --output table',
          validation: ['EFS replication configured', 'Database replication verified', 'RPO targets achievable']
        },
        {
          step: 'Validation and Cutover',
          detail: 'Execute enterprise DR drill coordinated across all MENA operations. Validate failover procedures and update business continuity plans.',
          cmd: 'aws backup list-recovery-points-by-backup-vault --backup-vault-name Default --output table',
          validation: ['Enterprise DR drill completed', 'Business continuity plan updated', 'Stakeholder sign-off obtained']
        }
      ]
    },
    bexprt: {
      fullName: 'Bexprt',
      website: 'https://bexprt.com',
      marketplace: 'https://aws.amazon.com/marketplace/pp/prodview-lq6wu3xzupfnm',
      marketplaceOfferings: [
        { label: 'Bex-DR\u2122 — Automated DR Testing', url: 'https://aws.amazon.com/marketplace/pp/prodview-lq6wu3xzupfnm' },
        { label: 'Bexprt Professional Services', url: 'https://aws.amazon.com/marketplace/pp/prodview-brio5vuzqjyak' },
        { label: 'Bexprt Professional Services — AWS Migration', url: 'https://aws.amazon.com/marketplace/pp/prodview-dacki2nxdltsy' }
      ],
      focus: 'Cloud Resilience, DRaaS, Enterprise AI, Serverless & Application Modernization',
      region: 'Saudi Arabia, UAE, UK, Europe, MENA',
      expertise: ['AWS Resilience Competency', 'DRaaS & DR Testing', 'Enterprise AI', 'Serverless Architecture', 'IaC Automation'],
      specialization: 'DRaaS & Serverless-first DR',
      drCapability: 'End-to-end DRaaS with automated failover, resilience assessment, continuous monitoring, and serverless-first DR with IaC automation',
      managedServices: 'Yes — managed DRaaS with ongoing monitoring, failover testing, and managed serverless operations',
      industries: 'Finance, Healthcare, E-commerce, Government, Startups',
      pros: [
        'AWS Advanced Tier Partner with AWS Resilience Competency and multi-year SCA with AWS',
        '2024 AWS Rising Star Consulting Partner of the Year — MENA',
        'Purpose-built DRaaS offering (Bex-DR\u2122) with automated failover orchestration',
        'Strong IaC and automation-first approach to DR',
        'Experienced with regulated industries requiring strict RTO/RPO compliance'
      ],
      cons: [
        'Smaller team compared to larger system integrators',
        'DRaaS focus may be less suited for greenfield migration projects'
      ],
      engagementSteps: [
        {
          step: 'Initial Consultation',
          detail: 'Bexprt conducts an initial consultation to understand your business continuity requirements, current DR posture, compliance obligations, and identifies serverless migration candidates.',
          cmd: 'aws resiliencehub list-apps --output table',
          validation: ['Business continuity requirements documented', 'Current DR gaps identified', 'Application portfolio assessed']
        },
        {
          step: 'Resilience Assessment',
          detail: 'Comprehensive resilience assessment using AWS Resilience Hub. Map application dependencies, identify single points of failure, benchmark current RTO/RPO, and review serverless patterns.',
          cmd: 'aws resiliencehub create-app --name my-app --assessment-schedule Disabled\naws resiliencehub list-app-assessments --app-arn <APP_ARN> --output table',
          validation: ['Resilience Hub assessment completed', 'RTO/RPO gaps quantified', 'Dependency map created', 'Serverless patterns identified']
        },
        {
          step: 'Architecture Design',
          detail: 'Design DRaaS architecture with automated failover, cross-region replication, recovery orchestration, and multi-region serverless architecture using API Gateway, Lambda, and DynamoDB Global Tables.',
          cmd: 'aws ec2 describe-vpcs --query "Vpcs[].{ID:VpcId,CIDR:CidrBlock}" --output table',
          validation: ['DRaaS architecture approved', 'Failover automation design reviewed', 'Multi-region serverless design confirmed']
        },
        {
          step: 'DRaaS Deployment',
          detail: 'Deploy the DRaaS solution including cross-region replication, automated failover runbooks, monitoring dashboards, and serverless infrastructure using SAM or CDK templates.',
          cmd: 'aws cloudformation deploy --template-file draas-stack.yaml --stack-name bexprt-draas --region me-south-1 --capabilities CAPABILITY_IAM',
          validation: ['DRaaS infrastructure deployed', 'Replication active', 'Monitoring dashboards live', 'Serverless stacks deployed']
        },
        {
          step: 'Failover Testing',
          detail: 'Execute controlled failover drills to validate recovery procedures. Measure actual RTO/RPO against targets, test Route 53 failover, and validate Lambda cold start times and API latency.',
          cmd: 'aws ec2 describe-instances --region me-south-1 --filters "Name=tag:DRaaS,Values=true" --output table',
          validation: ['Failover drill completed', 'RTO/RPO targets met', 'Recovery procedures validated', 'API latency within targets']
        },
        {
          step: 'Ongoing Monitoring',
          detail: 'Enable continuous resilience monitoring with automated alerts for drift, replication lag, and health check failures. Regular DR drill scheduling.',
          cmd: 'aws cloudwatch describe-alarms --alarm-name-prefix DRaaS --output table',
          validation: ['Continuous monitoring active', 'Alert channels configured', 'DR drill schedule established']
        }
      ]
    },
    ibm: {
      fullName: 'IBM Consulting',
      website: 'https://ibm.com/consulting',
      marketplace: 'https://aws.amazon.com/marketplace/seller-profile?id=seller-rb2eynu35ri4k',
      focus: 'Enterprise cloud transformation, hybrid cloud, and AI-driven operations',
      region: 'Global, MENA',
      expertise: ['Enterprise Cloud Transformation', 'Hybrid Cloud', 'AI-driven Operations'],
      specialization: 'Enterprise hybrid cloud & AI operations',
      drCapability: 'Enterprise-grade DR with hybrid cloud orchestration and automated recovery',
      managedServices: 'Yes — IBM Consulting managed cloud services',
      industries: 'Finance, Government, Healthcare, Telecom, Energy',
      pros: [
        'Global scale with deep enterprise transformation experience',
        'Hybrid cloud expertise bridging on-premises and AWS',
        'Available on AWS Marketplace for consolidated billing'
      ],
      cons: [
        'Large organization — engagement cycles can be lengthy',
        'Premium pricing compared to regional boutique partners'
      ],
      engagementSteps: [
        { step: 'Initial Consultation', detail: 'IBM Consulting conducts enterprise discovery covering hybrid cloud landscape, compliance requirements, and DR objectives.', cmd: 'aws organizations describe-organization --output json', validation: ['Enterprise landscape documented', 'DR objectives defined'] },
        { step: 'Resilience Assessment', detail: 'Assess current resilience posture using IBM methodologies and AWS Well-Architected Framework.', cmd: 'aws wellarchitected list-workloads --output table', validation: ['Resilience assessment completed', 'Gap analysis delivered'] },
        { step: 'Architecture Design', detail: 'Design hybrid DR architecture spanning on-premises and AWS with automated failover orchestration.', cmd: 'aws ec2 describe-vpcs --query "Vpcs[].{ID:VpcId,CIDR:CidrBlock}" --output table', validation: ['Hybrid DR architecture approved', 'Failover paths documented'] },
        { step: 'Infrastructure Provisioning', detail: 'Deploy DR infrastructure using IaC with IBM automation tooling and AWS CloudFormation.', cmd: 'aws cloudformation deploy --template-file ibm-dr-stack.yaml --stack-name ibm-dr --region me-south-1 --capabilities CAPABILITY_IAM', validation: ['DR stacks deployed', 'Hybrid connectivity verified'] },
        { step: 'Data Replication', detail: 'Configure cross-region and hybrid data replication for databases, storage, and application state.', cmd: 'aws dms describe-replication-tasks --output table', validation: ['Replication tasks active', 'Data consistency verified'] },
        { step: 'Validation and Handover', detail: 'Execute DR drill, validate recovery targets, and hand over operational runbooks to your team.', cmd: 'aws ec2 describe-instances --region me-south-1 --output table', validation: ['DR drill passed', 'Runbooks delivered', 'Knowledge transfer completed'] }
      ]
    },
    accenture: {
      fullName: 'Accenture',
      website: 'https://accenture.com',
      marketplace: 'https://aws.amazon.com/marketplace/seller-profile?id=8111dd5d-571b-498e-9925-cd37b724ff01',
      focus: 'Cloud-first transformation, industry solutions, and managed services',
      region: 'Global, MENA',
      expertise: ['Cloud-first Transformation', 'Industry Compliance', 'Managed Services'],
      specialization: 'Cloud-first transformation & industry solutions',
      drCapability: 'Large-scale DR with industry-specific compliance and automated recovery',
      managedServices: 'Yes — Accenture Cloud First managed services',
      industries: 'Finance, Government, Healthcare, Retail, Energy',
      pros: [
        'Massive global delivery capability with MENA presence',
        'Industry-specific compliance and regulatory expertise',
        'Available on AWS Marketplace'
      ],
      cons: [
        'Premium pricing tier — best suited for large enterprises',
        'Complex engagement structure for smaller projects'
      ],
      engagementSteps: [
        { step: 'Initial Consultation', detail: 'Accenture conducts a cloud-first assessment covering your industry compliance needs and DR requirements.', cmd: 'aws configservice describe-compliance-by-config-rule --output table', validation: ['Compliance landscape mapped', 'DR requirements documented'] },
        { step: 'Resilience Assessment', detail: 'Industry-specific resilience assessment with regulatory compliance mapping.', cmd: 'aws securityhub get-findings --filters \'{"SeverityLabel":[{"Value":"CRITICAL","Comparison":"EQUALS"}]}\' --output table', validation: ['Security posture assessed', 'Compliance gaps identified'] },
        { step: 'Architecture Design', detail: 'Design compliant DR architecture meeting industry regulations and recovery targets.', cmd: 'aws ec2 describe-vpcs --output table', validation: ['Compliant DR architecture approved', 'Regulatory requirements addressed'] },
        { step: 'Infrastructure Provisioning', detail: 'Deploy DR infrastructure with compliance guardrails and automated policy enforcement.', cmd: 'aws cloudformation deploy --template-file acn-dr-stack.yaml --stack-name acn-dr --region me-south-1 --capabilities CAPABILITY_IAM', validation: ['DR infrastructure deployed', 'Compliance guardrails active'] },
        { step: 'Data Replication', detail: 'Configure compliant data replication with encryption and access controls.', cmd: 'aws s3api get-bucket-replication --bucket my-primary-bucket', validation: ['Encrypted replication active', 'Access controls verified'] },
        { step: 'Validation and Handover', detail: 'Execute compliance-validated DR drill and deliver operational documentation.', cmd: 'aws backup list-recovery-points-by-backup-vault --backup-vault-name Default --output table', validation: ['Compliance-validated DR drill passed', 'Operational docs delivered'] }
      ]
    },
    deloitte: {
      fullName: 'Deloitte',
      website: 'https://deloitte.com',
      marketplace: 'https://aws.amazon.com/marketplace/seller-profile?id=seller-jp6eoggepz7k4',
      focus: 'Risk advisory, cloud strategy, and enterprise resilience',
      region: 'Global, MENA',
      expertise: ['Risk Advisory', 'Business Continuity', 'Regulatory Compliance'],
      specialization: 'Risk advisory & enterprise resilience',
      drCapability: 'Risk-driven DR strategy with business impact analysis and recovery orchestration',
      managedServices: 'Consulting-based with managed risk services',
      industries: 'Finance, Government, Healthcare, Energy, Telecom',
      pros: [
        'Deep risk advisory and business continuity planning expertise',
        'Strong regulatory and compliance consulting capabilities',
        'Available on AWS Marketplace'
      ],
      cons: [
        'Advisory-heavy model — implementation may require additional partners',
        'Premium consulting rates'
      ],
      engagementSteps: [
        { step: 'Initial Consultation', detail: 'Deloitte conducts a risk-focused discovery covering business impact analysis and DR maturity assessment.', cmd: 'aws organizations list-accounts --output table', validation: ['Business impact analysis completed', 'DR maturity baseline established'] },
        { step: 'Resilience Assessment', detail: 'Comprehensive risk assessment mapping threats to business processes and AWS infrastructure.', cmd: 'aws guardduty list-detectors --output table', validation: ['Threat landscape mapped', 'Risk register created'] },
        { step: 'Architecture Design', detail: 'Design risk-optimized DR architecture balancing cost, compliance, and recovery objectives.', cmd: 'aws ec2 describe-vpcs --output table', validation: ['Risk-optimized DR design approved', 'Cost-benefit analysis delivered'] },
        { step: 'Infrastructure Provisioning', detail: 'Deploy DR infrastructure with risk monitoring and automated compliance checks.', cmd: 'aws cloudformation deploy --template-file dtt-dr-stack.yaml --stack-name dtt-dr --region me-south-1 --capabilities CAPABILITY_IAM', validation: ['DR infrastructure deployed', 'Risk monitoring active'] },
        { step: 'Data Replication', detail: 'Configure data replication with risk-based prioritization and compliance controls.', cmd: 'aws rds describe-db-instances --output table', validation: ['Priority-based replication active', 'Compliance controls verified'] },
        { step: 'Validation and Handover', detail: 'Execute risk-validated DR drill with business stakeholder sign-off.', cmd: 'aws backup describe-backup-vault --backup-vault-name Default --output table', validation: ['Risk-validated DR drill passed', 'Stakeholder sign-off obtained'] }
      ]
    },
    publicis_sapient: {
      fullName: 'Publicis Sapient',
      website: 'https://publicissapient.com',
      marketplace: 'https://aws.amazon.com/marketplace/seller-profile?id=seller-wbus67mq2silm',
      focus: 'Digital business transformation and cloud-native application modernization',
      region: 'Global, MENA',
      expertise: ['Digital Transformation', 'Cloud-native Apps', 'DevOps Enablement'],
      specialization: 'Digital transformation & cloud-native apps',
      drCapability: 'Application-centric DR with cloud-native resilience patterns',
      managedServices: 'Consulting-based with DevOps enablement',
      industries: 'Retail, Finance, Telecom, Media, Travel',
      pros: [
        'Strong digital and customer experience transformation expertise',
        'Cloud-native application resilience patterns',
        'Agile delivery methodology with rapid iteration'
      ],
      cons: [
        'Application-focused — may need infrastructure partners for complex networking',
        'Consulting-based engagement model — not a managed services provider'
      ],
      engagementSteps: [
        { step: 'Initial Consultation', detail: 'Publicis Sapient assesses your digital application portfolio and identifies resilience requirements.', cmd: 'aws ecs list-clusters --output table', validation: ['Application portfolio mapped', 'Resilience requirements defined'] },
        { step: 'Resilience Assessment', detail: 'Application-centric resilience assessment covering microservices, APIs, and data flows.', cmd: 'aws apigateway get-rest-apis --output table', validation: ['Application resilience gaps identified', 'Dependency chains mapped'] },
        { step: 'Architecture Design', detail: 'Design cloud-native DR architecture with multi-region application deployment patterns.', cmd: 'aws ecs describe-clusters --output table', validation: ['Cloud-native DR design approved', 'Multi-region deployment strategy confirmed'] },
        { step: 'Infrastructure Provisioning', detail: 'Deploy application infrastructure using CI/CD pipelines with multi-region targets.', cmd: 'aws cloudformation deploy --template-file ps-dr-stack.yaml --stack-name ps-dr --region me-south-1 --capabilities CAPABILITY_IAM', validation: ['Application stacks deployed', 'CI/CD pipelines configured'] },
        { step: 'Data Replication', detail: 'Configure application data replication including caches, session stores, and databases.', cmd: 'aws elasticache describe-replication-groups --output table', validation: ['Cache replication active', 'Session store sync verified'] },
        { step: 'Validation and Handover', detail: 'Execute application-level failover testing and deliver DevOps runbooks.', cmd: 'aws ecs list-services --cluster my-cluster --output table', validation: ['Application failover tested', 'DevOps runbooks delivered'] }
      ]
    },
    tcs: {
      fullName: 'Tata Consultancy Services',
      website: 'https://tcs.com',
      marketplace: 'https://aws.amazon.com/marketplace/seller-profile?id=seller-di3udfb6zvzwc',
      focus: 'Enterprise IT services, cloud migration, and managed operations',
      region: 'Global, MENA',
      expertise: ['Enterprise Migration', 'Managed Operations', '24/7 NOC'],
      specialization: 'Enterprise IT services & managed operations',
      drCapability: 'Large-scale enterprise DR with managed operations and 24/7 support',
      managedServices: 'Yes — TCS managed cloud services with 24/7 NOC',
      industries: 'Finance, Manufacturing, Telecom, Government, Retail',
      pros: [
        'Massive global delivery with strong MENA presence',
        '24/7 managed operations and NOC capabilities',
        'Deep enterprise migration experience at scale'
      ],
      cons: [
        'Large engagement model — may be heavyweight for smaller projects',
        'Standardized delivery approach may be less flexible for niche requirements'
      ],
      engagementSteps: [
        { step: 'Initial Consultation', detail: 'TCS conducts enterprise-wide discovery covering all workloads, dependencies, and DR requirements.', cmd: 'aws ec2 describe-instances --query "Reservations[].Instances[].{ID:InstanceId,Type:InstanceType}" --output table', validation: ['Enterprise inventory completed', 'DR requirements documented'] },
        { step: 'Resilience Assessment', detail: 'Assess DR readiness across the enterprise using TCS methodologies and AWS best practices.', cmd: 'aws wellarchitected list-workloads --output table', validation: ['Enterprise DR readiness assessed', 'Remediation roadmap created'] },
        { step: 'Architecture Design', detail: 'Design enterprise DR architecture with managed operations integration.', cmd: 'aws ec2 describe-vpcs --output table', validation: ['Enterprise DR architecture approved', 'Managed ops integration designed'] },
        { step: 'Infrastructure Provisioning', detail: 'Deploy DR infrastructure at scale with TCS automation frameworks.', cmd: 'aws cloudformation deploy --template-file tcs-dr-stack.yaml --stack-name tcs-dr --region me-south-1 --capabilities CAPABILITY_IAM', validation: ['DR infrastructure deployed at scale', 'Automation frameworks active'] },
        { step: 'Data Replication', detail: 'Configure enterprise data replication across all critical data stores.', cmd: 'aws dms describe-replication-tasks --output table', validation: ['Enterprise replication active', 'Data consistency verified'] },
        { step: 'Validation and Handover', detail: 'Execute enterprise DR drill and transition to TCS managed operations.', cmd: 'aws ec2 describe-instances --region me-south-1 --output table', validation: ['Enterprise DR drill passed', 'Managed ops transition completed'] }
      ]
    },
    hcl: {
      fullName: 'HCLTech',
      website: 'https://hcltech.com',
      marketplace: 'https://aws.amazon.com/marketplace/seller-profile?id=0fa59f05-09a0-4a3b-a193-bbbbcf7bd7a5',
      focus: 'Cloud infrastructure services, application modernization, and managed operations',
      region: 'Global, MENA',
      expertise: ['Infrastructure Modernization', 'CloudSMART Platform', 'Application Modernization'],
      specialization: 'Cloud infrastructure & application modernization',
      drCapability: 'Infrastructure-centric DR with automated recovery and managed operations',
      managedServices: 'Yes — HCL CloudSMART managed services',
      industries: 'Finance, Manufacturing, Telecom, Healthcare, Retail',
      pros: [
        'Strong infrastructure modernization and automation expertise',
        'HCL CloudSMART platform for managed cloud operations',
        'Competitive pricing with flexible engagement models'
      ],
      cons: [
        'Infrastructure-heavy focus — application-layer DR may need augmentation',
        'Large organization with varying team quality across regions'
      ],
      engagementSteps: [
        { step: 'Initial Consultation', detail: 'HCLTech conducts infrastructure discovery and DR requirements gathering.', cmd: 'aws ec2 describe-instances --output table', validation: ['Infrastructure inventory completed', 'DR requirements gathered'] },
        { step: 'Resilience Assessment', detail: 'Infrastructure resilience assessment covering compute, storage, networking, and security.', cmd: 'aws ec2 describe-vpcs --output table', validation: ['Infrastructure resilience assessed', 'Single points of failure identified'] },
        { step: 'Architecture Design', detail: 'Design infrastructure DR architecture with CloudSMART automation integration.', cmd: 'aws ec2 describe-availability-zones --region me-south-1 --output table', validation: ['Infrastructure DR design approved', 'Automation strategy confirmed'] },
        { step: 'Infrastructure Provisioning', detail: 'Deploy DR infrastructure using HCL automation tooling and AWS CloudFormation.', cmd: 'aws cloudformation deploy --template-file hcl-dr-stack.yaml --stack-name hcl-dr --region me-south-1 --capabilities CAPABILITY_IAM', validation: ['DR infrastructure deployed', 'CloudSMART monitoring active'] },
        { step: 'Data Replication', detail: 'Configure infrastructure-level data replication for EBS, RDS, and S3.', cmd: 'aws s3api get-bucket-replication --bucket my-primary-bucket', validation: ['Storage replication active', 'Database replication verified'] },
        { step: 'Validation and Handover', detail: 'Execute infrastructure DR drill and transition to managed operations.', cmd: 'aws ec2 describe-instances --region me-south-1 --output table', validation: ['Infrastructure DR drill passed', 'Managed ops handover completed'] }
      ]
    },
    noventiq: {
      fullName: 'Noventiq',
      website: 'https://noventiq.com',
      marketplace: 'https://aws.amazon.com/marketplace/seller-profile?id=b3628d4c-0688-4097-a217-57a8401cbba1',
      focus: 'Digital transformation, cloud solutions, cybersecurity, and managed services',
      region: 'Global (60+ countries), MENA, CIS, Asia Pacific',
      expertise: ['AWS Premier Consulting', 'Managed Services', 'Data & Analytics', 'Migration', 'DevOps'],
      specialization: 'Digital transformation & managed cloud services',
      drCapability: 'Security-focused DR with cyber resilience and compliance',
      managedServices: 'Yes — managed security and cloud operations with 6 AWS Competencies',
      industries: 'Government, Finance, Education, Healthcare, Manufacturing',
      pros: [
        'AWS Premier Consulting Partner with 6 AWS Competencies and 250+ certified specialists',
        'Global presence across 60+ countries with local delivery teams',
        'Strategic Collaboration Agreement with AWS and 500+ successful cloud deployments'
      ],
      cons: [
        'Large organization — engagement may involve longer procurement cycles',
        'Broad focus across many competencies — may need to verify depth in specific DR scenarios'
      ],
      engagementSteps: [
        { step: 'Initial Consultation', detail: 'Noventiq conducts security-focused discovery covering cyber resilience and DR requirements.', cmd: 'aws securityhub describe-hub --output json', validation: ['Security posture documented', 'Cyber resilience requirements defined'] },
        { step: 'Resilience Assessment', detail: 'Cyber resilience assessment covering security controls, backup integrity, and recovery procedures.', cmd: 'aws guardduty list-detectors --output table', validation: ['Cyber resilience gaps identified', 'Security controls assessed'] },
        { step: 'Architecture Design', detail: 'Design security-hardened DR architecture with cyber recovery capabilities.', cmd: 'aws ec2 describe-vpcs --output table', validation: ['Security-hardened DR design approved', 'Cyber recovery procedures defined'] },
        { step: 'Infrastructure Provisioning', detail: 'Deploy security-hardened DR infrastructure with compliance guardrails.', cmd: 'aws cloudformation deploy --template-file nvq-dr-stack.yaml --stack-name nvq-dr --region me-south-1 --capabilities CAPABILITY_IAM', validation: ['Hardened DR infrastructure deployed', 'Security guardrails active'] },
        { step: 'Data Replication', detail: 'Configure encrypted data replication with integrity verification.', cmd: 'aws backup list-backup-plans --output table', validation: ['Encrypted replication active', 'Integrity checks configured'] },
        { step: 'Validation and Handover', detail: 'Execute cyber recovery drill and deliver security operations runbooks.', cmd: 'aws securityhub get-findings --output table', validation: ['Cyber recovery drill passed', 'Security ops runbooks delivered'] }
      ]
    },
    dxc: {
      fullName: 'DXC Technology',
      website: 'https://dxc.com',
      marketplace: 'https://aws.amazon.com/marketplace/seller-profile?id=b435ec12-1d42-4e7a-8fc2-a68c5f11ee02',
      focus: 'Enterprise IT outsourcing, cloud infrastructure, and managed services',
      region: 'Global, MENA',
      expertise: ['Enterprise IT Outsourcing', 'Managed Cloud', 'SLA-backed Operations'],
      specialization: 'Enterprise IT outsourcing & managed cloud',
      drCapability: 'Enterprise managed DR with 24/7 operations and SLA-backed recovery',
      managedServices: 'Yes — DXC managed cloud with SLA-backed operations',
      industries: 'Finance, Government, Healthcare, Insurance, Manufacturing',
      pros: [
        'SLA-backed managed DR operations with 24/7 support',
        'Deep enterprise IT outsourcing experience',
        'Available on AWS Marketplace'
      ],
      cons: [
        'Traditional IT outsourcing model — less cloud-native approach',
        'Large organization with complex engagement processes'
      ],
      engagementSteps: [
        { step: 'Initial Consultation', detail: 'DXC conducts enterprise IT assessment covering infrastructure, applications, and DR requirements.', cmd: 'aws ec2 describe-instances --output table', validation: ['Enterprise IT assessment completed', 'DR SLA requirements defined'] },
        { step: 'Resilience Assessment', detail: 'Assess DR readiness against SLA targets and compliance requirements.', cmd: 'aws wellarchitected list-workloads --output table', validation: ['SLA gap analysis completed', 'Compliance requirements mapped'] },
        { step: 'Architecture Design', detail: 'Design SLA-backed DR architecture with managed operations integration.', cmd: 'aws ec2 describe-vpcs --output table', validation: ['SLA-backed DR design approved', 'Operations model defined'] },
        { step: 'Infrastructure Provisioning', detail: 'Deploy managed DR infrastructure with DXC operations tooling.', cmd: 'aws cloudformation deploy --template-file dxc-dr-stack.yaml --stack-name dxc-dr --region me-south-1 --capabilities CAPABILITY_IAM', validation: ['Managed DR infrastructure deployed', 'Operations tooling active'] },
        { step: 'Data Replication', detail: 'Configure SLA-compliant data replication with monitoring and alerting.', cmd: 'aws dms describe-replication-tasks --output table', validation: ['SLA-compliant replication active', 'Monitoring dashboards live'] },
        { step: 'Validation and Handover', detail: 'Execute SLA-validated DR drill and transition to DXC managed operations.', cmd: 'aws ec2 describe-instances --region me-south-1 --output table', validation: ['SLA-validated DR drill passed', 'Managed ops transition completed'] }
      ]
    },
    redington: {
      fullName: 'Redington Gulf (Value Division)',
      website: 'https://redingtongroup.com',
      marketplace: 'https://aws.amazon.com/marketplace/seller-profile?id=6fdfa9db-344e-4f5a-9d1e-83b81df8c41c',
      focus: 'Cloud distribution, managed services, security, and cost optimization across MENA',
      region: 'UAE, Saudi Arabia, Bahrain, Turkey, Africa, MENA',
      crisisContact: { email: 'support@trackmycloud.com', region: 'UAE', context: 'Region impairment crisis support' },
      expertise: ['AWS Security Competency', 'Managed Services', 'Cloud Distribution', 'Partner Enablement'],
      specialization: 'Cloud distribution, managed services & security',
      drCapability: 'Managed DR services with backup and recovery management, cross-region resilience, and ISO 27001 certified delivery',
      managedServices: 'Yes — 24/7 managed cloud operations with ISO 27001 certified delivery centre',
      industries: 'Enterprise, Government, Finance, Healthcare, E-commerce',
      pros: [
        'First AWS Partner in the Middle East to achieve AWS Security Competency (Infrastructure Protection)',
        'Broad MENA presence across 38 markets with 39,500+ channel partners',
        'AWS Distributor Partners of the Year — EMEA winner (re:Invent 2023)',
        'Strategic Collaboration Agreement with AWS since 2022',
        'Available on AWS Marketplace for consolidated billing'
      ],
      cons: [
        'Distribution heritage — primarily a channel enabler rather than direct implementation partner',
        'Large organization — engagement may involve partner ecosystem coordination'
      ],
      engagementSteps: [
        { step: 'Initial Consultation', detail: 'Redington conducts an initial assessment of your cloud environment, security posture, and DR requirements. They leverage their ISO 27001 certified delivery centre for structured discovery.', cmd: 'aws ec2 describe-instances --query "Reservations[].Instances[].{ID:InstanceId,Type:InstanceType,State:State.Name,AZ:Placement.AvailabilityZone}" --output table', validation: ['Cloud environment inventory documented', 'DR requirements and RTO/RPO targets defined'] },
        { step: 'Security and Resilience Assessment', detail: 'Comprehensive security assessment leveraging Redington\'s AWS Security Competency. Evaluate infrastructure protection, compliance posture, and resilience gaps.', cmd: 'aws securityhub get-findings --filters \'{"SeverityLabel":[{"Value":"CRITICAL","Comparison":"EQUALS"}]}\' --output table', validation: ['Security posture assessed', 'Infrastructure protection gaps identified', 'Compliance requirements mapped'] },
        { step: 'Architecture Design', detail: 'Design target DR architecture with security controls, cost optimization, and managed services integration. Leverage Redington\'s Cost Optima service for right-sizing.', cmd: 'aws ec2 describe-vpcs --query "Vpcs[].{ID:VpcId,CIDR:CidrBlock}" --output table', validation: ['DR architecture approved', 'Security controls designed', 'Cost optimization plan delivered'] },
        { step: 'Infrastructure Provisioning', detail: 'Deploy DR infrastructure with security guardrails and managed services overlay. Redington provides 24/7 operational support from their certified delivery centre.', cmd: 'aws cloudformation deploy --template-file redington-dr-stack.yaml --stack-name redington-dr --region me-south-1 --capabilities CAPABILITY_IAM', validation: ['DR infrastructure deployed', 'Security guardrails active', 'Managed services monitoring enabled'] },
        { step: 'Data Replication', detail: 'Configure cross-region data replication with encryption and access controls. Set up backup and recovery management using AWS-native services.', cmd: 'aws backup list-backup-plans --output table', validation: ['Backup policies configured', 'Cross-region replication active', 'Encryption verified'] },
        { step: 'Validation and Handover', detail: 'Execute DR drill, validate security controls, and hand over operational runbooks. Ongoing managed services support available through Redington\'s 24/7 operations centre.', cmd: 'aws backup list-recovery-points-by-backup-vault --backup-vault-name Default --output table', validation: ['DR drill completed successfully', 'Security controls validated', 'Operational runbooks delivered'] }
      ]
    },
    limoncloud: {
      fullName: 'LimonCloud',
      website: 'https://limoncloud.com',
      marketplace: null,
      focus: 'Cloud transformation, managed services, DevOps, and application modernization',
      region: 'Turkey, MENA',
      expertise: ['Cloud Migration', 'Managed Operations', 'DevOps', 'Application Modernization'],
      specialization: 'Cloud transformation & managed services',
      drCapability: 'DR solutions with managed cloud operations and local data center backup',
      managedServices: 'Yes — managed cloud operations with AWS Premier Tier expertise',
      industries: 'Media, E-commerce, Manufacturing, Enterprise',
      pros: [
        'AWS Premier Tier Partner with deep Turkey market expertise',
        'Operates two data centers in Turkey (Istanbul and Ankara)',
        'Proven clients including S Sport Plus, Tims&B Productions, FarmasiX, and Sampa'
      ],
      cons: [
        'Primarily Turkey-focused — limited presence outside the region',
        'No AWS Marketplace listing'
      ],
      engagementSteps: [
        { step: 'Initial Consultation', detail: 'LimonCloud conducts a focused discovery of your cloud environment and DR needs.', cmd: 'aws ec2 describe-instances --query "Reservations[].Instances[].{ID:InstanceId,Type:InstanceType}" --output table', validation: ['Cloud environment documented', 'DR needs assessed'] },
        { step: 'Resilience Assessment', detail: 'Lightweight resilience assessment focused on critical workloads and cost-effective recovery options.', cmd: 'aws backup list-backup-plans --output table', validation: ['Critical workloads identified', 'Cost-effective DR options evaluated'] },
        { step: 'Architecture Design', detail: 'Design cost-optimized DR architecture using AWS-native services.', cmd: 'aws ec2 describe-vpcs --output table', validation: ['Cost-optimized DR design approved', 'AWS-native services selected'] },
        { step: 'Infrastructure Provisioning', detail: 'Deploy DR infrastructure using CloudFormation with cost optimization.', cmd: 'aws cloudformation deploy --template-file lc-dr-stack.yaml --stack-name lc-dr --region me-south-1 --capabilities CAPABILITY_IAM', validation: ['DR infrastructure deployed', 'Cost optimization verified'] },
        { step: 'Data Replication', detail: 'Configure cost-effective data replication using AWS Backup and S3 replication.', cmd: 'aws s3api get-bucket-replication --bucket my-primary-bucket', validation: ['Backup policies active', 'S3 replication configured'] },
        { step: 'Validation and Handover', detail: 'Execute DR drill and hand over operational runbooks with cost monitoring.', cmd: 'aws ce get-cost-and-usage --time-period Start=2024-01-01,End=2024-01-31 --granularity MONTHLY --metrics BlendedCost --output table', validation: ['DR drill passed', 'Cost monitoring configured', 'Runbooks delivered'] }
      ]
    }
  };

  // ============================================================
  // REGIONAL_COMPARISON_ROWS — Comparison dimensions for partner table
  // ============================================================
  var REGIONAL_COMPARISON_ROWS = [
    { label: 'Primary Focus', key: 'focus' },
    { label: 'AWS Specialization', key: 'specialization' },
    { label: 'DR/Migration Capability', key: 'drCapability' },
    { label: 'Managed Services', key: 'managedServices' },
    { label: 'Industries Served', key: 'industries' },
    { label: 'Regional Presence', key: 'region' },
    { label: 'AWS Marketplace', key: 'marketplace' }
  ];

  // ============================================================
  // MATCHMAKING_ENGINE — Weighted scoring + deterministic hard rules
  // ============================================================
  var MATCHMAKING_ENGINE = {
    partnerNames: {
      controlmonkey: 'ControlMonkey',
      n2ws: 'N2W Backup & Recovery',
      firefly: 'Firefly',
      bestcloudfor_me: 'BestCloudForMe',
      integra: 'Integra Technologies',
      sudo: 'Sudo Consultants',
      zaintech: 'ZainTech',
      bexprt: 'Bexprt',
      ibm: 'IBM Consulting',
      accenture: 'Accenture',
      deloitte: 'Deloitte',
      publicis_sapient: 'Publicis Sapient',
      tcs: 'Tata Consultancy Services',
      hcl: 'HCLTech',
      noventiq: 'Noventiq',
      dxc: 'DXC Technology',
      limoncloud: 'LimonCloud',
      redington: 'Redington Gulf (Value Division)'
    },
    rules: [
      {
        id: 'r1',
        condition: function (s) { return s.mmUrgency === 'immediate' && s.mmData === 'heavy-db'; },
        partner: 'n2ws',
        confidence: 'High',
        reason: 'Accelerated recovery with heavy databases requires rapid backup and recovery — N2W specializes in automated backup, snapshot management, and fast restore for database-heavy workloads.'
      },
      {
        id: 'r2',
        condition: function (s) { return s.mmApproach === 'iac-rebuild'; },
        partners: ['controlmonkey', 'firefly'],
        confidence: 'High',
        reason: 'IaC rebuild approach aligns with infrastructure-as-code automation tools — ControlMonkey and Firefly specialize in IaC-driven recovery and environment reconstruction.'
      },
      {
        id: 'r3',
        condition: function (s) { return (s.mmComplexity === 'multi-vpc' || s.mmComplexity === 'hybrid') && s.mmUrgency === 'weeks'; },
        partners: ['integra', 'zaintech'],
        confidence: 'High',
        reason: 'Complex multi-VPC or hybrid environments with weeks of planning time benefit from regional partners with deep networking and infrastructure modernization expertise.'
      },
      {
        id: 'r4',
        condition: function (s) { return s.mmApproach === 'partner-led'; },
        partners: ['bestcloudfor_me', 'sudo'],
        confidence: 'High',
        reason: 'Partner-led migration requires hands-on engagement from experienced consultants — BestCloudForMe and Sudo Consultants offer end-to-end managed migration services in the MENA region.'
      },
      {
        id: 'r5',
        condition: function (s) { return s.mmApproach === 'fastest' && s.mmData === 'insignificant'; },
        partners: ['controlmonkey', 'firefly'],
        confidence: 'High',
        reason: 'Fastest recovery with insignificant data footprint favors IaC-driven tools that can rapidly reconstruct environments without heavy data migration.'
      }
    ],
    weights: {
      controlmonkey: {
        workload:   { ec2: 8, containers: 5, serverless: 3, mixed: 6 },
        data:       { insignificant: 9, stateful: 5, 'heavy-db': 3 },
        urgency:    { immediate: 8, days: 7, weeks: 4 },
        complexity:  { 'single-vpc': 7, 'multi-vpc': 5, hybrid: 4, 'multi-region': 6 },
        approach:   { fastest: 9, 'iac-rebuild': 10, 'backup-restore': 4, 'partner-led': 2 },
        industry:   { finance: 6, telco: 5, 'public-sector': 4, enterprise: 7, other: 5 }
      },
      n2ws: {
        workload:   { ec2: 9, containers: 4, serverless: 2, mixed: 6 },
        data:       { insignificant: 2, stateful: 8, 'heavy-db': 10 },
        urgency:    { immediate: 10, days: 7, weeks: 4 },
        complexity:  { 'single-vpc': 6, 'multi-vpc': 7, hybrid: 5, 'multi-region': 7 },
        approach:   { fastest: 7, 'iac-rebuild': 3, 'backup-restore': 10, 'partner-led': 2 },
        industry:   { finance: 8, telco: 5, 'public-sector': 6, enterprise: 7, other: 5 }
      },
      firefly: {
        workload:   { ec2: 7, containers: 7, serverless: 6, mixed: 8 },
        data:       { insignificant: 8, stateful: 5, 'heavy-db': 3 },
        urgency:    { immediate: 7, days: 8, weeks: 5 },
        complexity:  { 'single-vpc': 6, 'multi-vpc': 7, hybrid: 6, 'multi-region': 8 },
        approach:   { fastest: 8, 'iac-rebuild': 10, 'backup-restore': 4, 'partner-led': 2 },
        industry:   { finance: 6, telco: 6, 'public-sector': 5, enterprise: 7, other: 6 }
      },
      bestcloudfor_me: {
        workload:   { ec2: 6, containers: 5, serverless: 4, mixed: 7 },
        data:       { insignificant: 4, stateful: 7, 'heavy-db': 6 },
        urgency:    { immediate: 4, days: 6, weeks: 8 },
        complexity:  { 'single-vpc': 5, 'multi-vpc': 6, hybrid: 7, 'multi-region': 5 },
        approach:   { fastest: 3, 'iac-rebuild': 3, 'backup-restore': 5, 'partner-led': 10 },
        industry:   { finance: 5, telco: 8, 'public-sector': 5, enterprise: 8, other: 6 }
      },
      integra: {
        workload:   { ec2: 7, containers: 6, serverless: 4, mixed: 7 },
        data:       { insignificant: 4, stateful: 7, 'heavy-db': 6 },
        urgency:    { immediate: 3, days: 5, weeks: 9 },
        complexity:  { 'single-vpc': 4, 'multi-vpc': 9, hybrid: 9, 'multi-region': 7 },
        approach:   { fastest: 3, 'iac-rebuild': 5, 'backup-restore': 6, 'partner-led': 8 },
        industry:   { finance: 7, telco: 8, 'public-sector': 7, enterprise: 7, other: 5 }
      },
      sudo: {
        workload:   { ec2: 6, containers: 6, serverless: 5, mixed: 7 },
        data:       { insignificant: 5, stateful: 6, 'heavy-db': 5 },
        urgency:    { immediate: 4, days: 6, weeks: 8 },
        complexity:  { 'single-vpc': 6, 'multi-vpc': 6, hybrid: 7, 'multi-region': 5 },
        approach:   { fastest: 3, 'iac-rebuild': 4, 'backup-restore': 5, 'partner-led': 10 },
        industry:   { finance: 6, telco: 6, 'public-sector': 7, enterprise: 8, other: 6 }
      },
      zaintech: {
        workload:   { ec2: 7, containers: 6, serverless: 4, mixed: 7 },
        data:       { insignificant: 4, stateful: 7, 'heavy-db': 7 },
        urgency:    { immediate: 3, days: 5, weeks: 9 },
        complexity:  { 'single-vpc': 4, 'multi-vpc': 9, hybrid: 8, 'multi-region': 7 },
        approach:   { fastest: 4, 'iac-rebuild': 5, 'backup-restore': 6, 'partner-led': 7 },
        industry:   { finance: 7, telco: 9, 'public-sector': 7, enterprise: 8, other: 5 }
      },
      bexprt: {
        workload:   { ec2: 6, containers: 7, serverless: 9, mixed: 7 },
        data:       { insignificant: 7, stateful: 6, 'heavy-db': 5 },
        urgency:    { immediate: 4, days: 6, weeks: 7 },
        complexity:  { 'single-vpc': 7, 'multi-vpc': 6, hybrid: 6, 'multi-region': 6 },
        approach:   { fastest: 5, 'iac-rebuild': 7, 'backup-restore': 5, 'partner-led': 7 },
        industry:   { finance: 6, telco: 6, 'public-sector': 6, enterprise: 7, other: 7 }
      },
      ibm: {
        workload:   { ec2: 8, containers: 7, serverless: 5, mixed: 8 },
        data:       { insignificant: 4, stateful: 7, 'heavy-db': 7 },
        urgency:    { immediate: 4, days: 6, weeks: 8 },
        complexity:  { 'single-vpc': 5, 'multi-vpc': 8, hybrid: 9, 'multi-region': 8 },
        approach:   { fastest: 3, 'iac-rebuild': 5, 'backup-restore': 6, 'partner-led': 9 },
        industry:   { finance: 8, telco: 7, 'public-sector': 8, enterprise: 9, other: 6 }
      },
      accenture: {
        workload:   { ec2: 7, containers: 7, serverless: 6, mixed: 8 },
        data:       { insignificant: 4, stateful: 7, 'heavy-db': 6 },
        urgency:    { immediate: 3, days: 6, weeks: 8 },
        complexity:  { 'single-vpc': 5, 'multi-vpc': 8, hybrid: 8, 'multi-region': 7 },
        approach:   { fastest: 3, 'iac-rebuild': 4, 'backup-restore': 5, 'partner-led': 9 },
        industry:   { finance: 8, telco: 6, 'public-sector': 8, enterprise: 9, other: 6 }
      },
      deloitte: {
        workload:   { ec2: 6, containers: 6, serverless: 5, mixed: 7 },
        data:       { insignificant: 4, stateful: 6, 'heavy-db': 6 },
        urgency:    { immediate: 3, days: 5, weeks: 9 },
        complexity:  { 'single-vpc': 5, 'multi-vpc': 7, hybrid: 8, 'multi-region': 7 },
        approach:   { fastest: 2, 'iac-rebuild': 4, 'backup-restore': 5, 'partner-led': 9 },
        industry:   { finance: 9, telco: 6, 'public-sector': 8, enterprise: 8, other: 5 }
      },
      publicis_sapient: {
        workload:   { ec2: 5, containers: 8, serverless: 8, mixed: 7 },
        data:       { insignificant: 6, stateful: 5, 'heavy-db': 4 },
        urgency:    { immediate: 4, days: 7, weeks: 7 },
        complexity:  { 'single-vpc': 6, 'multi-vpc': 6, hybrid: 5, 'multi-region': 7 },
        approach:   { fastest: 5, 'iac-rebuild': 6, 'backup-restore': 4, 'partner-led': 7 },
        industry:   { finance: 6, telco: 7, 'public-sector': 5, enterprise: 7, other: 7 }
      },
      tcs: {
        workload:   { ec2: 8, containers: 7, serverless: 5, mixed: 8 },
        data:       { insignificant: 4, stateful: 7, 'heavy-db': 7 },
        urgency:    { immediate: 4, days: 6, weeks: 8 },
        complexity:  { 'single-vpc': 5, 'multi-vpc': 8, hybrid: 8, 'multi-region': 7 },
        approach:   { fastest: 3, 'iac-rebuild': 5, 'backup-restore': 6, 'partner-led': 8 },
        industry:   { finance: 7, telco: 7, 'public-sector': 7, enterprise: 8, other: 6 }
      },
      hcl: {
        workload:   { ec2: 8, containers: 6, serverless: 4, mixed: 7 },
        data:       { insignificant: 4, stateful: 7, 'heavy-db': 6 },
        urgency:    { immediate: 4, days: 6, weeks: 8 },
        complexity:  { 'single-vpc': 5, 'multi-vpc': 7, hybrid: 7, 'multi-region': 6 },
        approach:   { fastest: 4, 'iac-rebuild': 5, 'backup-restore': 6, 'partner-led': 8 },
        industry:   { finance: 7, telco: 6, 'public-sector': 6, enterprise: 8, other: 6 }
      },
      noventiq: {
        workload:   { ec2: 6, containers: 5, serverless: 4, mixed: 6 },
        data:       { insignificant: 4, stateful: 6, 'heavy-db': 5 },
        urgency:    { immediate: 3, days: 5, weeks: 7 },
        complexity:  { 'single-vpc': 5, 'multi-vpc': 6, hybrid: 6, 'multi-region': 5 },
        approach:   { fastest: 3, 'iac-rebuild': 4, 'backup-restore': 5, 'partner-led': 7 },
        industry:   { finance: 7, telco: 5, 'public-sector': 8, enterprise: 6, other: 5 }
      },
      dxc: {
        workload:   { ec2: 7, containers: 6, serverless: 4, mixed: 7 },
        data:       { insignificant: 4, stateful: 7, 'heavy-db': 6 },
        urgency:    { immediate: 3, days: 5, weeks: 8 },
        complexity:  { 'single-vpc': 5, 'multi-vpc': 7, hybrid: 7, 'multi-region': 6 },
        approach:   { fastest: 3, 'iac-rebuild': 4, 'backup-restore': 6, 'partner-led': 8 },
        industry:   { finance: 7, telco: 6, 'public-sector': 7, enterprise: 8, other: 5 }
      },
      redington: {
        workload:   { ec2: 7, containers: 5, serverless: 4, mixed: 6 },
        data:       { insignificant: 4, stateful: 6, 'heavy-db': 5 },
        urgency:    { immediate: 4, days: 6, weeks: 8 },
        complexity:  { 'single-vpc': 6, 'multi-vpc': 7, hybrid: 7, 'multi-region': 6 },
        approach:   { fastest: 3, 'iac-rebuild': 4, 'backup-restore': 6, 'partner-led': 8 },
        industry:   { finance: 7, telco: 6, 'public-sector': 7, enterprise: 8, other: 6 }
      },
      limoncloud: {
        workload:   { ec2: 7, containers: 6, serverless: 5, mixed: 7 },
        data:       { insignificant: 5, stateful: 6, 'heavy-db': 5 },
        urgency:    { immediate: 5, days: 7, weeks: 6 },
        complexity:  { 'single-vpc': 7, 'multi-vpc': 5, hybrid: 4, 'multi-region': 4 },
        approach:   { fastest: 5, 'iac-rebuild': 5, 'backup-restore': 6, 'partner-led': 6 },
        industry:   { finance: 5, telco: 4, 'public-sector': 4, enterprise: 5, other: 8 }
      }
    },
    recommend: function (s) {
      var self = this;
      var partnerKeys = Object.keys(self.partnerNames);

      // 1. Check hard rules in priority order
      for (var i = 0; i < self.rules.length; i++) {
        var rule = self.rules[i];
        if (rule.condition(s)) {
          var rPartner;
          if (rule.partner) {
            rPartner = rule.partner;
          } else {
            // Multiple partners — pick the one with highest weighted score
            var bestKey = rule.partners[0];
            var bestScore = -1;
            for (var p = 0; p < rule.partners.length; p++) {
              var sc = self._score(rule.partners[p], s);
              if (sc > bestScore) { bestScore = sc; bestKey = rule.partners[p]; }
            }
            rPartner = bestKey;
          }
          return {
            partner: rPartner,
            partnerName: self.partnerNames[rPartner],
            confidence: rule.confidence,
            reason: rule.reason,
            score: self._normalize(self._score(rPartner, s)),
            executionPlan: self._buildExecutionPlan(rPartner)
          };
        }
      }

      // 2. Weighted scoring fallback
      var topPartner = partnerKeys[0];
      var topScore = -1;
      for (var j = 0; j < partnerKeys.length; j++) {
        var score = self._score(partnerKeys[j], s);
        if (score > topScore) { topScore = score; topPartner = partnerKeys[j]; }
      }

      var normalized = self._normalize(topScore);
      var confidence = normalized > 70 ? 'High' : normalized > 40 ? 'Medium' : 'Low';

      return {
        partner: topPartner,
        partnerName: self.partnerNames[topPartner],
        confidence: confidence,
        reason: 'Based on weighted scoring across your workload profile, data requirements, urgency, environment complexity, and recovery approach — ' + self.partnerNames[topPartner] + ' is the best fit with a score of ' + normalized + '/100.',
        score: normalized,
        executionPlan: self._buildExecutionPlan(topPartner)
      };
    },
    _score: function (partnerKey, s) {
      var w = this.weights[partnerKey];
      if (!w) return 0;
      var total = 0;
      var dims = [
        { key: 'workload', val: s.mmWorkload },
        { key: 'data', val: s.mmData },
        { key: 'urgency', val: s.mmUrgency },
        { key: 'complexity', val: s.mmComplexity },
        { key: 'approach', val: s.mmApproach },
        { key: 'industry', val: s.mmIndustry }
      ];
      for (var i = 0; i < dims.length; i++) {
        if (dims[i].val && w[dims[i].key] && w[dims[i].key][dims[i].val] !== undefined) {
          total += w[dims[i].key][dims[i].val];
        }
      }
      return total;
    },
    _normalize: function (raw) {
      // Max possible score: 6 dimensions × 10 max weight = 60
      var maxPossible = 60;
      return Math.round((raw / maxPossible) * 100);
    },
    _buildExecutionPlan: function (partnerKey) {
      var name = this.partnerNames[partnerKey] || partnerKey;
      return [
        {
          step: 'Confirm AWS Service Health',
          detail: 'Before initiating recovery, verify the AWS Health Dashboard to ensure the destination region is operational and not experiencing service disruptions. If APIs are unresponsive for the source region, migration via AWS methods may not be possible.',
          cmd: '# Check AWS Health Dashboard\n# Console: https://health.aws.amazon.com/health/home\naws health describe-events --filter eventStatusCodes=open --region us-east-1\n\n# Check public status\n# https://status.aws.amazon.com/',
          validation: ['AWS Health Dashboard reviewed', 'Destination region confirmed operational', 'Source region API availability assessed']
        },
        {
          step: 'Initial Partner Engagement',
          detail: 'Contact ' + name + ' to initiate the engagement. Share your workload profile, recovery requirements, and timeline expectations.',
          cmd: '# Verify current AWS account and region\naws sts get-caller-identity\naws configure get region',
          validation: ['Partner engagement initiated', 'NDA and data handling agreements in place']
        },
        {
          step: 'Pre-Migration: Enable Region & Request Quotas',
          detail: 'Enable the target region if opt-in. Compare and request service quota increases to match source region. Use the Service Quotas Replicator tool to automate this. For urgent requests, open a support case.',
          cmd: '# Check and enable target region\naws account get-region-opt-status --region-name <TARGET_REGION>\naws account enable-region --region-name <TARGET_REGION>\n\n# Compare and request quotas\naws service-quotas list-service-quotas --service-code ec2 --region <SOURCE_REGION> --output table\naws service-quotas list-service-quotas --service-code ec2 --region <TARGET_REGION> --output table\naws service-quotas request-service-quota-increase --service-code ec2 --quota-code L-1216C47A --desired-value 100 --region <TARGET_REGION>',
          validation: ['Target region enabled', 'Quota comparison completed', 'Quota increase requests submitted']
        },
        {
          step: 'Environment Discovery and Assessment',
          detail: name + ' conducts a comprehensive discovery of your AWS environment, mapping workloads, dependencies, and data stores. If APIs are unresponsive for the source region, migration via AWS methods may not be possible — check the Health Dashboard first.',
          cmd: 'aws ec2 describe-instances --query "Reservations[].Instances[].{ID:InstanceId,Type:InstanceType,State:State.Name}" --output table\naws rds describe-db-instances --query "DBInstances[].{ID:DBInstanceIdentifier,Engine:Engine,Status:DBInstanceStatus}" --output table',
          validation: ['Full workload inventory documented', 'Dependency map created', 'Data classification completed']
        },
        {
          step: 'Architecture Design and Planning',
          detail: 'Design the target architecture with ' + name + ', including VPC layout, security controls, and recovery procedures. Configure regional STS endpoints for resilience.',
          cmd: 'aws ec2 describe-vpcs --query "Vpcs[].{ID:VpcId,CIDR:CidrBlock,State:State}" --output table\naws ec2 describe-subnets --query "Subnets[].{ID:SubnetId,VPC:VpcId,AZ:AvailabilityZone,CIDR:CidrBlock}" --output table',
          validation: ['Target architecture approved', 'Network design validated', 'Security controls defined']
        },
        {
          step: 'Infrastructure Provisioning',
          detail: 'Provision target infrastructure using IaC templates. Deploy networking, compute, storage, and security resources. Include retry with exponential backoff in automation scripts.',
          cmd: 'aws cloudformation deploy --template-file target-infra.yaml --stack-name recovery-infra --region me-south-1\naws cloudformation describe-stacks --stack-name recovery-infra --query "Stacks[0].StackStatus"',
          validation: ['Infrastructure deployed successfully', 'Security groups and NACLs verified', 'IAM roles and policies configured']
        },
        {
          step: 'Data Replication and Migration',
          detail: 'Configure data replication or migration pipelines for S3, RDS, and other data stores. Include retry with exponential backoff in migration scripts.',
          cmd: 'aws s3api get-bucket-replication --bucket my-primary-bucket\naws dms describe-replication-tasks --query "ReplicationTasks[].{ID:ReplicationTaskIdentifier,Status:Status}" --output table',
          validation: ['Data replication active and healthy', 'Replication lag within acceptable thresholds', 'Data integrity checks passed']
        },
        {
          step: 'Validation, Testing, and Cutover',
          detail: 'Execute DR drill or migration cutover. Validate recovery procedures, data integrity, and RTO/RPO targets.',
          cmd: 'aws ec2 describe-instances --region me-south-1 --query "Reservations[].Instances[].{ID:InstanceId,State:State.Name}" --output table\naws rds describe-db-instances --region me-south-1 --query "DBInstances[].{ID:DBInstanceIdentifier,Status:DBInstanceStatus}" --output table',
          validation: ['DR drill or cutover completed successfully', 'RTO/RPO targets validated', 'Runbook documented and approved', 'Post-migration monitoring configured']
        }
      ];
    }
  };

  // ============================================================
  // DISCOVERY_SCRIPT_CONTENT — Full Bash discovery script
  // ============================================================
  var DISCOVERY_SCRIPT_CONTENT = '#!/bin/bash\n' +
    '# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.\n' +
    '# SPDX-License-Identifier: Apache-2.0\n' +
    '# ============================================================\n' +
    '# RMA Environment Discovery Script\n' +
    '# Generated by Resilience Migration Advisor (RMA)\n' +
    '# Scans all enabled AWS regions for resources and dependencies\n' +
    '# Produces: resources-inventory.csv, resource-dependencies.csv\n' +
    '#\n' +
    '# PAGINATION NOTE:\n' +
    '# AWS CLI v2 auto-paginates all list/describe calls by default,\n' +
    '# returning the full result set across multiple API pages.\n' +
    '# AWS CLI v1 also auto-paginates most commands.\n' +
    '# This script relies on that default behavior. If you are using\n' +
    '# a custom AWS CLI configuration with max_items or have disabled\n' +
    '# auto-pagination, results may be incomplete for large environments.\n' +
    '# Verify: aws configure get cli_pager  (should be empty or "less")\n' +
    '# Ref: https://docs.aws.amazon.com/cli/latest/userguide/cli-usage-pagination.html\n' +
    '# ============================================================\n' +
    'set -o pipefail\n' +
    '\n' +
    '# --- Configuration ---\n' +
    'MAX_RETRIES=3\n' +
    'INVENTORY_FILE="resources-inventory.csv"\n' +
    'DEPENDENCY_FILE="resource-dependencies.csv"\n' +
    'SCRIPT_START=$(date +%s)\n' +
    'TOTAL_RESOURCES=0\n' +
    'TOTAL_DEPENDENCIES=0\n' +
    'REGIONS_SCANNED=0\n' +
    'COLLECTION_FAILURES=""\n' +
    '\n' +
    '# --- Color output helpers ---\n' +
    'RED="\\033[0;31m"\n' +
    'GREEN="\\033[0;32m"\n' +
    'YELLOW="\\033[1;33m"\n' +
    'CYAN="\\033[0;36m"\n' +
    'NC="\\033[0m"\n' +
    '\n' +
    'log_info()  { echo -e "${CYAN}[INFO]${NC}  $1"; }\n' +
    'log_ok()    { echo -e "${GREEN}[OK]${NC}    $1"; }\n' +
    'log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }\n' +
    'log_error() { echo -e "${RED}[ERROR]${NC} $1"; }\n' +
    '\n' +
    'track_failure() {\n' +
    '  local resource_type="$1"\n' +
    '  local region="$2"\n' +
    '  local reason="$3"\n' +
    '  COLLECTION_FAILURES="${COLLECTION_FAILURES}${resource_type} in ${region}: ${reason}\\n"\n' +
    '}\n' +
    '\n' +
    '# --- Retry with exponential backoff ---\n' +
    'aws_retry() {\n' +
    '  local attempt=0\n' +
    '  local output=""\n' +
    '  local exit_code=0\n' +
    '  while [ $attempt -lt $MAX_RETRIES ]; do\n' +
    '    output=$(eval "$@" 2>&1)\n' +
    '    exit_code=$?\n' +
    '    if [ $exit_code -eq 0 ]; then\n' +
    '      echo "$output"\n' +
    '      return 0\n' +
    '    fi\n' +
    '    if echo "$output" | grep -qi "AccessDenied\\|UnauthorizedAccess\\|AuthorizationError"; then\n' +
    '      echo "$output" >&2\n' +
    '      return 2\n' +
    '    fi\n' +
    '    if echo "$output" | grep -qi "InvalidClientTokenId\\|UnrecognizedClientException\\|not available\\|Could not connect"; then\n' +
    '      echo "$output" >&2\n' +
    '      return 3\n' +
    '    fi\n' +
    '    attempt=$((attempt + 1))\n' +
    '    if [ $attempt -lt $MAX_RETRIES ]; then\n' +
    '      local wait_time=$((1 << attempt))\n' +
    '      log_warn "Retry $attempt/$MAX_RETRIES in ${wait_time}s..." >&2\n' +
    '      sleep $wait_time\n' +
    '    fi\n' +
    '  done\n' +
    '  echo "$output" >&2\n' +
    '  return 1\n' +
    '}\n' +
    '\n' +
    'sanitize_csv() {\n' +
    '  local val="$1"\n' +
    '  # Prefix dangerous leading characters with single quote to neutralize formula execution\n' +
    '  case "$val" in\n' +
    '    =*|+*|-*|@*) val="\'$val" ;;\n' +
    '  esac\n' +
    '  # Escape embedded double quotes by doubling them (RFC 4180)\n' +
    '  val="${val//\\"/\\"\\"}"\n' +
    '  # Wrap in double quotes to safely preserve commas and special characters\n' +
    '  printf \'"%s"\' "$val"\n' +
    '}\n' +
    '\n' +
    'add_inventory() {\n' +
    '  local rtype rid rname region service account details\n' +
    '  rtype="$(sanitize_csv "$1")"\n' +
    '  rid="$(sanitize_csv "$2")"\n' +
    '  rname="$(sanitize_csv "$3")"\n' +
    '  region="$(sanitize_csv "$4")"\n' +
    '  service="$(sanitize_csv "$5")"\n' +
    '  account="$(sanitize_csv "$6")"\n' +
    '  details="$(sanitize_csv "$7")"\n' +
    '  printf \'%s,%s,%s,%s,%s,%s,%s\\n\' "$rtype" "$rid" "$rname" "$region" "$service" "$account" "$details" >> "$INVENTORY_FILE"\n' +
    '  TOTAL_RESOURCES=$((TOTAL_RESOURCES + 1))\n' +
    '}\n' +
    '\n' +
    'add_dependency() {\n' +
    '  local src dep_type target region\n' +
    '  src="$(sanitize_csv "$1")"\n' +
    '  dep_type="$(sanitize_csv "$2")"\n' +
    '  target="$(sanitize_csv "$3")"\n' +
    '  region="$(sanitize_csv "$4")"\n' +
    '  printf \'%s,%s,%s,%s\\n\' "$src" "$dep_type" "$target" "$region" >> "$DEPENDENCY_FILE"\n' +
    '  TOTAL_DEPENDENCIES=$((TOTAL_DEPENDENCIES + 1))\n' +
    '}\n' +
    '\n' +
    '# ============================================================\n' +
    '# DEPENDENCY CHECKS\n' +
    '# ============================================================\n' +
    'log_info "RMA Environment Discovery Script starting..."\n' +
    '\n' +
    '# Check AWS CLI\n' +
    'if ! command -v aws &>/dev/null; then\n' +
    '  log_error "AWS CLI is not installed."\n' +
    '  echo "Please install the AWS CLI:"\n' +
    '  echo "  https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"\n' +
    '  echo "  pip install awscli"\n' +
    '  echo "  brew install awscli"\n' +
    '  exit 1\n' +
    'fi\n' +
    'log_ok "AWS CLI found: $(aws --version 2>&1 | head -1)"\n' +
    '\n' +
    '# Check credentials\n' +
    'CALLER_IDENTITY=$(aws sts get-caller-identity --output text 2>&1)\n' +
    'if [ $? -ne 0 ]; then\n' +
    '  log_error "AWS credentials are not configured or are invalid."\n' +
    '  echo "Please configure credentials:"\n' +
    '  echo "  aws configure"\n' +
    '  echo "  export AWS_PROFILE=your-profile"\n' +
    '  echo "  export AWS_ACCESS_KEY_ID=... AWS_SECRET_ACCESS_KEY=..."\n' +
    '  exit 1\n' +
    'fi\n' +
    'ACCOUNT_ID=$(aws sts get-caller-identity --query "Account" --output text)\n' +
    'log_ok "Authenticated as Account: $ACCOUNT_ID"\n' +
    '\n' +
    '# ============================================================\n' +
    '# INITIALIZE CSV FILES\n' +
    '# ============================================================\n' +
    'echo "ResourceType,ResourceId,ResourceName,Region,Service,AccountId,AdditionalDetails" > "$INVENTORY_FILE"\n' +
    'chmod 600 "$INVENTORY_FILE"\n' +
    'echo "SourceResource,DependencyType,TargetResource,Region" > "$DEPENDENCY_FILE"\n' +
    'chmod 600 "$DEPENDENCY_FILE"\n' +
    '\n' +
    '# ============================================================\n' +
    '# REGION DETECTION\n' +
    '# ============================================================\n' +
    'log_info "Detecting enabled regions..."\n' +
    'REGIONS=$(aws ec2 describe-regions --query "Regions[].RegionName" --output text)\n' +
    'if [ -z "$REGIONS" ]; then\n' +
    '  log_error "Could not detect AWS regions."\n' +
    '  exit 1\n' +
    'fi\n' +
    'REGION_COUNT=$(echo "$REGIONS" | wc -w | tr -d " ")\n' +
    'log_ok "Found $REGION_COUNT enabled regions"\n' +
    '\n' +
    '# ============================================================\n' +
    '# ACCOUNT-LEVEL INFO (global, collected once)\n' +
    '# ============================================================\n' +
    'log_info "Collecting account-level information..."\n' +
    'add_inventory "Account" "$ACCOUNT_ID" "AWSAccount" "global" "STS" "$ACCOUNT_ID" "RegionCount=$REGION_COUNT"\n' +
    '\n' +
    '# Organization membership\n' +
    'ORG_ID=$(aws_retry "aws organizations describe-organization --query \\\"Organization.Id\\\" --output text" 2>/dev/null)\n' +
    'if [ $? -eq 0 ] && [ -n "$ORG_ID" ] && [ "$ORG_ID" != "None" ]; then\n' +
    '  add_inventory "Organization" "$ORG_ID" "AWSOrganization" "global" "Organizations" "$ACCOUNT_ID" ""\n' +
    'fi\n' +
    '\n' +
    '# Cross-account roles\n' +
    'log_info "Checking for cross-account IAM roles..."\n' +
    'ROLES=$(aws_retry "aws iam list-roles --query \\\"Roles[].{RoleName:RoleName,Arn:Arn}\\\" --output text" 2>/dev/null)\n' +
    'if [ $? -eq 0 ] && [ -n "$ROLES" ]; then\n' +
    '  echo "$ROLES" | while IFS=$\x27\\t\x27 read -r arn rname; do\n' +
    '    if [ -n "$arn" ]; then\n' +
    '      TRUST=$(aws_retry "aws iam get-role --role-name \\\"$rname\\\" --query \\\"Role.AssumeRolePolicyDocument\\\" --output text" 2>/dev/null)\n' +
    '      if echo "$TRUST" | grep -q "arn:aws:iam::" 2>/dev/null; then\n' +
    '        TRUSTED_ACCOUNTS=$(echo "$TRUST" | grep -o "arn:aws:iam::[0-9]*" | grep -v "$ACCOUNT_ID" | sort -u)\n' +
    '        if [ -n "$TRUSTED_ACCOUNTS" ]; then\n' +
    '          add_inventory "CrossAccountRole" "$arn" "$rname" "global" "IAM" "$ACCOUNT_ID" "TrustedAccounts=$(echo "$TRUSTED_ACCOUNTS" | tr \x27\\n\x27 \x27;\x27)"\n' +
    '        fi\n' +
    '      fi\n' +
    '    fi\n' +
    '  done\n' +
    'fi\n' +
    '\n' +
    '# ============================================================\n' +
    '# GLOBAL SERVICES (collected once, not per-region)\n' +
    '# ============================================================\n' +
    '\n' +
    '# --- S3 Buckets (global) ---\n' +
    'log_info "Collecting S3 buckets (global)..."\n' +
    'S3_BUCKETS=$(aws_retry "aws s3api list-buckets --query \\\"Buckets[].Name\\\" --output text" 2>/dev/null)\n' +
    'S3_RC=$?\n' +
    'if [ $S3_RC -eq 0 ] && [ -n "$S3_BUCKETS" ] && [ "$S3_BUCKETS" != "None" ]; then\n' +
    '  S3_COUNT=0\n' +
    '  # Intentional word splitting: S3_BUCKETS is a space-delimited list from AWS CLI\n' +
    '  for bucket in $S3_BUCKETS; do\n' +
    '    BUCKET_REGION=$(aws_retry "aws s3api get-bucket-location --bucket \\\"$bucket\\\" --query \\\"LocationConstraint\\\" --output text" 2>/dev/null)\n' +
    '    if [ "$BUCKET_REGION" = "None" ] || [ -z "$BUCKET_REGION" ]; then BUCKET_REGION="us-east-1"; fi\n' +
    '    ENCRYPTION=$(aws_retry "aws s3api get-bucket-encryption --bucket \\\"$bucket\\\" --query \\\"ServerSideEncryptionConfiguration.Rules[0].ApplyServerSideEncryptionByDefault.SSEAlgorithm\\\" --output text" 2>/dev/null || echo "None")\n' +
    '    # S3 bucket size via CloudWatch (read-only, no object listing)\n' +
    '    CW_START=$(date -u -v-2d +%Y-%m-%dT%H:%M:%S 2>/dev/null || date -u -d \\\"2 days ago\\\" +%Y-%m-%dT%H:%M:%S)\n' +
    '    CW_END=$(date -u +%Y-%m-%dT%H:%M:%S)\n' +
    '    BUCKET_SIZE_BYTES=$(aws_retry "aws cloudwatch get-metric-statistics --namespace AWS/S3 --metric-name BucketSizeBytes --dimensions Name=BucketName,Value=\\\"$bucket\\\" Name=StorageType,Value=StandardStorage --start-time \\\"$CW_START\\\" --end-time \\\"$CW_END\\\" --period 86400 --statistics Average --query \\\"Datapoints[0].Average\\\" --output text" 2>/dev/null || echo "N/A")\n' +
    '    if [ "$BUCKET_SIZE_BYTES" = "None" ] || [ -z "$BUCKET_SIZE_BYTES" ]; then BUCKET_SIZE_BYTES="N/A"; fi\n' +
    '    add_inventory "S3Bucket" "$bucket" "$bucket" "$BUCKET_REGION" "S3" "$ACCOUNT_ID" "Encryption=$ENCRYPTION,SizeBytes=$BUCKET_SIZE_BYTES"\n' +
    '    S3_COUNT=$((S3_COUNT + 1))\n' +
    '    # S3 replication\n' +
    '    REPL_DEST=$(aws_retry "aws s3api get-bucket-replication --bucket \\\"$bucket\\\" --query \\\"ReplicationConfiguration.Rules[].Destination.Bucket\\\" --output text" 2>/dev/null)\n' +
    '    if [ $? -eq 0 ] && [ -n "$REPL_DEST" ] && [ "$REPL_DEST" != "None" ]; then\n' +
    '      # Intentional word splitting: REPL_DEST is a space-delimited list from AWS CLI\n' +
    '      for dest in $REPL_DEST; do\n' +
    '        add_dependency "$bucket" "S3-ReplicationDestination" "$dest" "$BUCKET_REGION"\n' +
    '      done\n' +
    '    fi\n' +
    '    # S3 lifecycle\n' +
    '    LC_STATUS=$(aws_retry "aws s3api get-bucket-lifecycle-configuration --bucket \\\"$bucket\\\" --query \\\"length(Rules)\\\" --output text" 2>/dev/null || echo "0")\n' +
    '    if [ "$LC_STATUS" != "0" ] && [ "$LC_STATUS" != "None" ] && [ -n "$LC_STATUS" ]; then\n' +
    '      add_inventory "S3Lifecycle" "${bucket}-lifecycle" "$bucket" "$BUCKET_REGION" "S3" "$ACCOUNT_ID" "RuleCount=$LC_STATUS"\n' +
    '    fi\n' +
    '  done\n' +
    '  log_ok "Found $S3_COUNT S3 buckets"\n' +
    'elif [ $S3_RC -eq 2 ]; then\n' +
    '  log_warn "Permission denied for S3 bucket listing"\n' +
    '  track_failure "S3Buckets" "global" "Permission denied"\n' +
    'elif [ $S3_RC -eq 3 ]; then\n' +
    '  log_warn "S3 service not available"\n' +
    '  track_failure "S3Buckets" "global" "Service unavailable"\n' +
    'fi\n' +
    '\n' +
    '# --- CloudFront Distributions (global) ---\n' +
    'log_info "Collecting CloudFront distributions (global)..."\n' +
    'CF_OUTPUT=$(aws_retry "aws cloudfront list-distributions --query \\\"DistributionList.Items[].{Id:Id,Domain:DomainName,Origins:Origins.Items[].DomainName}\\\" --output text" 2>/dev/null)\n' +
    'CF_RC=$?\n' +
    'if [ $CF_RC -eq 0 ] && [ -n "$CF_OUTPUT" ] && [ "$CF_OUTPUT" != "None" ]; then\n' +
    '  CF_IDS=$(aws_retry "aws cloudfront list-distributions --query \\\"DistributionList.Items[].Id\\\" --output text" 2>/dev/null)\n' +
    '  CF_COUNT=0\n' +
    '  # Intentional word splitting: CF_IDS is a space-delimited list from AWS CLI\n' +
    '  for cfid in $CF_IDS; do\n' +
    '    CF_DOMAIN=$(aws_retry "aws cloudfront get-distribution --id \\\"$cfid\\\" --query \\\"Distribution.DomainName\\\" --output text" 2>/dev/null)\n' +
    '    CF_ORIGINS=$(aws_retry "aws cloudfront get-distribution --id \\\"$cfid\\\" --query \\\"Distribution.DistributionConfig.Origins.Items[].DomainName\\\" --output text" 2>/dev/null)\n' +
    '    add_inventory "CloudFrontDistribution" "$cfid" "$CF_DOMAIN" "global" "CloudFront" "$ACCOUNT_ID" "Origins=$(echo "$CF_ORIGINS" | tr \x27\\t\x27 \x27;\x27)"\n' +
    '    CF_COUNT=$((CF_COUNT + 1))\n' +
    '    # CloudFront -> Origin dependencies\n' +
    '    # Intentional word splitting: CF_ORIGINS is a space-delimited list from AWS CLI\n' +
    '    for origin in $CF_ORIGINS; do\n' +
    '      add_dependency "$cfid" "CloudFront-Origin" "$origin" "global"\n' +
    '    done\n' +
    '  done\n' +
    '  log_ok "Found $CF_COUNT CloudFront distributions"\n' +
    'elif [ $CF_RC -eq 2 ]; then\n' +
    '  log_warn "Permission denied for CloudFront"\n' +
    '  track_failure "CloudFront" "global" "Permission denied"\n' +
    'elif [ $CF_RC -eq 3 ]; then\n' +
    '  log_warn "CloudFront service not available"\n' +
    '  track_failure "CloudFront" "global" "Service unavailable"\n' +
    'fi\n' +
    '\n' +
    '# --- Route 53 (global) ---\n' +
    'log_info "Collecting Route 53 hosted zones (global)..."\n' +
    'R53_ZONES=$(aws_retry "aws route53 list-hosted-zones --query \\\"HostedZones[].{Id:Id,Name:Name}\\\" --output text" 2>/dev/null)\n' +
    'R53_RC=$?\n' +
    'if [ $R53_RC -eq 0 ] && [ -n "$R53_ZONES" ] && [ "$R53_ZONES" != "None" ]; then\n' +
    '  R53_COUNT=0\n' +
    '  echo "$R53_ZONES" | while IFS=$\x27\\t\x27 read -r zid zname; do\n' +
    '    if [ -n "$zid" ]; then\n' +
    '      ZONE_ID=$(echo "$zid" | sed "s|/hostedzone/||")\n' +
    '      add_inventory "Route53HostedZone" "$ZONE_ID" "$zname" "global" "Route53" "$ACCOUNT_ID" ""\n' +
    '      R53_COUNT=$((R53_COUNT + 1))\n' +
    '      # Records for this zone\n' +
    '      RECORDS=$(aws_retry "aws route53 list-resource-record-sets --hosted-zone-id \\\"$zid\\\" --query \\\"ResourceRecordSets[].{Name:Name,Type:Type,Alias:AliasTarget.DNSName}\\\" --output text" 2>/dev/null)\n' +
    '      if [ $? -eq 0 ] && [ -n "$RECORDS" ]; then\n' +
    '        echo "$RECORDS" | while IFS=$\x27\\t\x27 read -r alias rname rtype; do\n' +
    '          if [ -n "$rname" ]; then\n' +
    '            add_inventory "Route53Record" "${ZONE_ID}:${rname}:${rtype}" "$rname" "global" "Route53" "$ACCOUNT_ID" "Type=$rtype"\n' +
    '            # Route53 -> LB/CloudFront alias dependencies\n' +
    '            if [ -n "$alias" ] && [ "$alias" != "None" ]; then\n' +
    '              if echo "$alias" | grep -qi "elb\\|alb\\|nlb\\|amazonaw"; then\n' +
    '                add_dependency "${ZONE_ID}:${rname}" "Route53-LoadBalancer" "$alias" "global"\n' +
    '              elif echo "$alias" | grep -qi "cloudfront"; then\n' +
    '                add_dependency "${ZONE_ID}:${rname}" "Route53-CloudFront" "$alias" "global"\n' +
    '              fi\n' +
    '            fi\n' +
    '          fi\n' +
    '        done\n' +
    '      fi\n' +
    '    fi\n' +
    '  done\n' +
    '  log_ok "Found Route 53 hosted zones"\n' +
    'elif [ $R53_RC -eq 2 ]; then\n' +
    '  log_warn "Permission denied for Route 53"\n' +
    '  track_failure "Route53" "global" "Permission denied"\n' +
    'elif [ $R53_RC -eq 3 ]; then\n' +
    '  log_warn "Route 53 service not available"\n' +
    '  track_failure "Route53" "global" "Service unavailable"\n' +
    'fi\n' +
    '\n' +
    '# Route 53 Health Checks\n' +
    'log_info "Collecting Route 53 health checks (global)..."\n' +
    'R53_HC=$(aws_retry "aws route53 list-health-checks --query \\\"HealthChecks[].{Id:Id,Config:HealthCheckConfig.FullyQualifiedDomainName}\\\" --output text" 2>/dev/null)\n' +
    'if [ $? -eq 0 ] && [ -n "$R53_HC" ] && [ "$R53_HC" != "None" ]; then\n' +
    '  echo "$R53_HC" | while IFS=$\x27\\t\x27 read -r hcfqdn hcid; do\n' +
    '    if [ -n "$hcid" ]; then\n' +
    '      add_inventory "Route53HealthCheck" "$hcid" "$hcfqdn" "global" "Route53" "$ACCOUNT_ID" ""\n' +
    '    fi\n' +
    '  done\n' +
    'fi\n' +
    '\n' +
    '# ============================================================\n' +
    '# PER-REGION RESOURCE COLLECTION\n' +
    '# ============================================================\n' +
    '# Intentional word splitting: REGIONS is a space-delimited list from AWS CLI\n' +
    'for REGION in $REGIONS; do\n' +
    '  REGION_START=$(date +%s)\n' +
    '  log_info "\\n========== Region: $REGION =========="\n' +
    '\n' +
    '  # --- Network Topology ---\n' +
    '\n' +
    '  # VPCs\n' +
    '  log_info "[$REGION] Collecting VPCs..."\n' +
    '  VPCS=$(aws_retry "aws ec2 describe-vpcs --region $REGION --query \\\"Vpcs[].{Id:VpcId,Cidr:CidrBlock,Name:Tags[?Key==\\\\\\\"Name\\\\\\\"].Value|[0]}\\\" --output text" 2>/dev/null)\n' +
    '  VPC_RC=$?\n' +
    '  if [ $VPC_RC -eq 0 ] && [ -n "$VPCS" ] && [ "$VPCS" != "None" ]; then\n' +
    '    VPC_COUNT=0\n' +
    '    echo "$VPCS" | while IFS=$\x27\\t\x27 read -r vcidr vid vname; do\n' +
    '      if [ -n "$vid" ]; then\n' +
    '        add_inventory "VPC" "$vid" "${vname:-$vid}" "$REGION" "EC2" "$ACCOUNT_ID" "CIDR=$vcidr"\n' +
    '        VPC_COUNT=$((VPC_COUNT + 1))\n' +
    '      fi\n' +
    '    done\n' +
    '    log_ok "[$REGION] Found VPCs"\n' +
    '  elif [ $VPC_RC -eq 2 ]; then\n' +
    '    log_warn "[$REGION] Permission denied for VPCs"\n' +
    '    track_failure "VPC" "$REGION" "Permission denied"\n' +
    '  elif [ $VPC_RC -eq 3 ]; then\n' +
    '    log_warn "[$REGION] EC2 service not available"\n' +
    '    track_failure "VPC" "$REGION" "Service unavailable"\n' +
    '  fi\n' +
    '\n' +
    '  # Subnets\n' +
    '  log_info "[$REGION] Collecting Subnets..."\n' +
    '  SUBNETS=$(aws_retry "aws ec2 describe-subnets --region $REGION --query \\\"Subnets[].{Id:SubnetId,VpcId:VpcId,AZ:AvailabilityZone,Cidr:CidrBlock,Name:Tags[?Key==\\\\\\\"Name\\\\\\\"].Value|[0]}\\\" --output text" 2>/dev/null)\n' +
    '  if [ $? -eq 0 ] && [ -n "$SUBNETS" ] && [ "$SUBNETS" != "None" ]; then\n' +
    '    echo "$SUBNETS" | while IFS=$\x27\\t\x27 read -r saz scidr sid svpc sname; do\n' +
    '      if [ -n "$sid" ]; then\n' +
    '        add_inventory "Subnet" "$sid" "${sname:-$sid}" "$REGION" "EC2" "$ACCOUNT_ID" "VPC=$svpc;AZ=$saz;CIDR=$scidr"\n' +
    '        add_dependency "$svpc" "VPC-Subnet" "$sid" "$REGION"\n' +
    '      fi\n' +
    '    done\n' +
    '  fi\n' +
    '\n' +
    '  # Route Tables\n' +
    '  log_info "[$REGION] Collecting Route Tables..."\n' +
    '  RTS=$(aws_retry "aws ec2 describe-route-tables --region $REGION --query \\\"RouteTables[].{Id:RouteTableId,VpcId:VpcId}\\\" --output text" 2>/dev/null)\n' +
    '  if [ $? -eq 0 ] && [ -n "$RTS" ] && [ "$RTS" != "None" ]; then\n' +
    '    echo "$RTS" | while IFS=$\x27\\t\x27 read -r rtid rtvpc; do\n' +
    '      if [ -n "$rtid" ]; then\n' +
    '        add_inventory "RouteTable" "$rtid" "$rtid" "$REGION" "EC2" "$ACCOUNT_ID" "VPC=$rtvpc"\n' +
    '      fi\n' +
    '    done\n' +
    '  fi\n' +
    '\n' +
    '  # Internet Gateways\n' +
    '  log_info "[$REGION] Collecting Internet Gateways..."\n' +
    '  IGWS=$(aws_retry "aws ec2 describe-internet-gateways --region $REGION --query \\\"InternetGateways[].{Id:InternetGatewayId,Attachments:Attachments[].VpcId}\\\" --output text" 2>/dev/null)\n' +
    '  if [ $? -eq 0 ] && [ -n "$IGWS" ] && [ "$IGWS" != "None" ]; then\n' +
    '    echo "$IGWS" | while IFS=$\x27\\t\x27 read -r igwatt igwid; do\n' +
    '      if [ -n "$igwid" ]; then\n' +
    '        add_inventory "InternetGateway" "$igwid" "$igwid" "$REGION" "EC2" "$ACCOUNT_ID" "VPC=$igwatt"\n' +
    '      fi\n' +
    '    done\n' +
    '  fi\n' +
    '\n' +
    '  # NAT Gateways\n' +
    '  log_info "[$REGION] Collecting NAT Gateways..."\n' +
    '  NATGWS=$(aws_retry "aws ec2 describe-nat-gateways --region $REGION --query \\\"NatGateways[?State==\\\\\\\"available\\\\\\\"].{Id:NatGatewayId,SubnetId:SubnetId,VpcId:VpcId}\\\" --output text" 2>/dev/null)\n' +
    '  if [ $? -eq 0 ] && [ -n "$NATGWS" ] && [ "$NATGWS" != "None" ]; then\n' +
    '    echo "$NATGWS" | while IFS=$\x27\\t\x27 read -r natid natsub natvpc; do\n' +
    '      if [ -n "$natid" ]; then\n' +
    '        add_inventory "NATGateway" "$natid" "$natid" "$REGION" "EC2" "$ACCOUNT_ID" "VPC=$natvpc;Subnet=$natsub"\n' +
    '      fi\n' +
    '    done\n' +
    '  fi\n' +
    '\n' +
    '  # Transit Gateways\n' +
    '  log_info "[$REGION] Collecting Transit Gateways..."\n' +
    '  TGWS=$(aws_retry "aws ec2 describe-transit-gateways --region $REGION --query \\\"TransitGateways[].{Id:TransitGatewayId,State:State}\\\" --output text" 2>/dev/null)\n' +
    '  if [ $? -eq 0 ] && [ -n "$TGWS" ] && [ "$TGWS" != "None" ]; then\n' +
    '    echo "$TGWS" | while IFS=$\x27\\t\x27 read -r tgwid tgwstate; do\n' +
    '      if [ -n "$tgwid" ]; then\n' +
    '        add_inventory "TransitGateway" "$tgwid" "$tgwid" "$REGION" "EC2" "$ACCOUNT_ID" "State=$tgwstate"\n' +
    '        # TGW Attachments\n' +
    '        TGW_ATT=$(aws_retry "aws ec2 describe-transit-gateway-attachments --region $REGION --filters Name=transit-gateway-id,Values=$tgwid --query \\\"TransitGatewayAttachments[].{Id:TransitGatewayAttachmentId,ResId:ResourceId,ResType:ResourceType}\\\" --output text" 2>/dev/null)\n' +
    '        if [ $? -eq 0 ] && [ -n "$TGW_ATT" ] && [ "$TGW_ATT" != "None" ]; then\n' +
    '          echo "$TGW_ATT" | while IFS=$\x27\\t\x27 read -r attid attres atttype; do\n' +
    '            if [ -n "$attid" ]; then\n' +
    '              add_inventory "TransitGatewayAttachment" "$attid" "$attid" "$REGION" "EC2" "$ACCOUNT_ID" "TGW=$tgwid;Resource=$attres;Type=$atttype"\n' +
    '              add_dependency "$tgwid" "TGW-VPCAttachment" "$attres" "$REGION"\n' +
    '            fi\n' +
    '          done\n' +
    '        fi\n' +
    '        # TGW Route Tables\n' +
    '        TGW_RT=$(aws_retry "aws ec2 describe-transit-gateway-route-tables --region $REGION --filters Name=transit-gateway-id,Values=$tgwid --query \\\"TransitGatewayRouteTables[].TransitGatewayRouteTableId\\\" --output text" 2>/dev/null)\n' +
    '        if [ $? -eq 0 ] && [ -n "$TGW_RT" ] && [ "$TGW_RT" != "None" ]; then\n' +
    '          # Intentional word splitting: TGW_RT is a space-delimited list from AWS CLI\n' +
    '          for tgwrt in $TGW_RT; do\n' +
    '            add_inventory "TransitGatewayRouteTable" "$tgwrt" "$tgwrt" "$REGION" "EC2" "$ACCOUNT_ID" "TGW=$tgwid"\n' +
    '          done\n' +
    '        fi\n' +
    '      fi\n' +
    '    done\n' +
    '  fi\n' +
    '\n' +
    '  # VPC Peering\n' +
    '  log_info "[$REGION] Collecting VPC Peering connections..."\n' +
    '  PEERS=$(aws_retry "aws ec2 describe-vpc-peering-connections --region $REGION --query \\\"VpcPeeringConnections[].{Id:VpcPeeringConnectionId,Req:RequesterVpcInfo.VpcId,Acc:AccepterVpcInfo.VpcId,Status:Status.Code}\\\" --output text" 2>/dev/null)\n' +
    '  if [ $? -eq 0 ] && [ -n "$PEERS" ] && [ "$PEERS" != "None" ]; then\n' +
    '    echo "$PEERS" | while IFS=$\x27\\t\x27 read -r pacc pid preq pstatus; do\n' +
    '      if [ -n "$pid" ]; then\n' +
    '        add_inventory "VPCPeering" "$pid" "$pid" "$REGION" "EC2" "$ACCOUNT_ID" "Requester=$preq;Accepter=$pacc;Status=$pstatus"\n' +
    '      fi\n' +
    '    done\n' +
    '  fi\n' +
    '\n' +
    '  # VPC Endpoints (PrivateLink + Gateway)\n' +
    '  log_info "[$REGION] Collecting VPC Endpoints..."\n' +
    '  VPCE=$(aws_retry "aws ec2 describe-vpc-endpoints --region $REGION --query \\\"VpcEndpoints[].{Id:VpcEndpointId,VpcId:VpcId,Service:ServiceName,Type:VpcEndpointType,Subnets:SubnetIds,SGs:Groups[].GroupId}\\\" --output text" 2>/dev/null)\n' +
    '  if [ $? -eq 0 ] && [ -n "$VPCE" ] && [ "$VPCE" != "None" ]; then\n' +
    '    VPCE_IDS=$(aws_retry "aws ec2 describe-vpc-endpoints --region $REGION --query \\\"VpcEndpoints[].VpcEndpointId\\\" --output text" 2>/dev/null)\n' +
    '    # Intentional word splitting: VPCE_IDS is a space-delimited list from AWS CLI\n' +
    '    for veid in $VPCE_IDS; do\n' +
    '      VE_SVC=$(aws_retry "aws ec2 describe-vpc-endpoints --region $REGION --vpc-endpoint-ids $veid --query \\\"VpcEndpoints[0].ServiceName\\\" --output text" 2>/dev/null)\n' +
    '      VE_VPC=$(aws_retry "aws ec2 describe-vpc-endpoints --region $REGION --vpc-endpoint-ids $veid --query \\\"VpcEndpoints[0].VpcId\\\" --output text" 2>/dev/null)\n' +
    '      VE_TYPE=$(aws_retry "aws ec2 describe-vpc-endpoints --region $REGION --vpc-endpoint-ids $veid --query \\\"VpcEndpoints[0].VpcEndpointType\\\" --output text" 2>/dev/null)\n' +
    '      VE_SUBNETS=$(aws_retry "aws ec2 describe-vpc-endpoints --region $REGION --vpc-endpoint-ids $veid --query \\\"VpcEndpoints[0].SubnetIds\\\" --output text" 2>/dev/null)\n' +
    '      VE_SGS=$(aws_retry "aws ec2 describe-vpc-endpoints --region $REGION --vpc-endpoint-ids $veid --query \\\"VpcEndpoints[0].Groups[].GroupId\\\" --output text" 2>/dev/null)\n' +
    '      add_inventory "VPCEndpoint" "$veid" "$VE_SVC" "$REGION" "EC2" "$ACCOUNT_ID" "VPC=$VE_VPC;Type=$VE_TYPE"\n' +
    '      add_dependency "$veid" "VPCEndpoint-Service" "$VE_SVC" "$REGION"\n' +
    '      if [ -n "$VE_SUBNETS" ] && [ "$VE_SUBNETS" != "None" ]; then\n' +
    '        # Intentional word splitting: VE_SUBNETS is a space-delimited list from AWS CLI\n' +
    '        for vesub in $VE_SUBNETS; do\n' +
    '          add_dependency "$veid" "VPCEndpoint-Subnet" "$vesub" "$REGION"\n' +
    '        done\n' +
    '      fi\n' +
    '      if [ -n "$VE_SGS" ] && [ "$VE_SGS" != "None" ]; then\n' +
    '        # Intentional word splitting: VE_SGS is a space-delimited list from AWS CLI\n' +
    '        for vesg in $VE_SGS; do\n' +
    '          add_dependency "$veid" "VPCEndpoint-SecurityGroup" "$vesg" "$REGION"\n' +
    '        done\n' +
    '      fi\n' +
    '    done\n' +
    '  fi\n' +
    '\n' +
    '  # Elastic IPs\n' +
    '  log_info "[$REGION] Collecting Elastic IPs..."\n' +
    '  EIPS=$(aws_retry "aws ec2 describe-addresses --region $REGION --query \\\"Addresses[].{AllocationId:AllocationId,PublicIp:PublicIp,InstanceId:InstanceId}\\\" --output text" 2>/dev/null)\n' +
    '  if [ $? -eq 0 ] && [ -n "$EIPS" ] && [ "$EIPS" != "None" ]; then\n' +
    '    echo "$EIPS" | while IFS=$\x27\\t\x27 read -r eipalloc eipinst eippub; do\n' +
    '      if [ -n "$eipalloc" ]; then\n' +
    '        add_inventory "ElasticIP" "$eipalloc" "$eippub" "$REGION" "EC2" "$ACCOUNT_ID" "Instance=$eipinst"\n' +
    '      fi\n' +
    '    done\n' +
    '  fi\n' +
    '\n' +
    '  # ENIs\n' +
    '  log_info "[$REGION] Collecting ENIs..."\n' +
    '  ENIS=$(aws_retry "aws ec2 describe-network-interfaces --region $REGION --query \\\"NetworkInterfaces[].{Id:NetworkInterfaceId,SubnetId:SubnetId,VpcId:VpcId,Type:InterfaceType}\\\" --output text" 2>/dev/null)\n' +
    '  if [ $? -eq 0 ] && [ -n "$ENIS" ] && [ "$ENIS" != "None" ]; then\n' +
    '    echo "$ENIS" | while IFS=$\x27\\t\x27 read -r eniid enisub enitype enivpc; do\n' +
    '      if [ -n "$eniid" ]; then\n' +
    '        add_inventory "ENI" "$eniid" "$eniid" "$REGION" "EC2" "$ACCOUNT_ID" "VPC=$enivpc;Subnet=$enisub;Type=$enitype"\n' +
    '      fi\n' +
    '    done\n' +
    '  fi\n' +
    '\n' +
    '  # Site-to-Site VPN\n' +
    '  log_info "[$REGION] Collecting VPN connections..."\n' +
    '  VPNS=$(aws_retry "aws ec2 describe-vpn-connections --region $REGION --query \\\"VpnConnections[].{Id:VpnConnectionId,State:State,CGWID:CustomerGatewayId,VGWID:VpnGatewayId}\\\" --output text" 2>/dev/null)\n' +
    '  if [ $? -eq 0 ] && [ -n "$VPNS" ] && [ "$VPNS" != "None" ]; then\n' +
    '    echo "$VPNS" | while IFS=$\x27\\t\x27 read -r vpncgw vpnid vpnstate vpnvgw; do\n' +
    '      if [ -n "$vpnid" ]; then\n' +
    '        add_inventory "VPNConnection" "$vpnid" "$vpnid" "$REGION" "EC2" "$ACCOUNT_ID" "State=$vpnstate;CGW=$vpncgw;VGW=$vpnvgw"\n' +
    '      fi\n' +
    '    done\n' +
    '  fi\n' +
    '\n' +
    '  # Customer Gateways\n' +
    '  CGWS=$(aws_retry "aws ec2 describe-customer-gateways --region $REGION --query \\\"CustomerGateways[].{Id:CustomerGatewayId,State:State,IP:IpAddress}\\\" --output text" 2>/dev/null)\n' +
    '  if [ $? -eq 0 ] && [ -n "$CGWS" ] && [ "$CGWS" != "None" ]; then\n' +
    '    echo "$CGWS" | while IFS=$\x27\\t\x27 read -r cgwid cgwip cgwstate; do\n' +
    '      if [ -n "$cgwid" ]; then\n' +
    '        add_inventory "CustomerGateway" "$cgwid" "$cgwid" "$REGION" "EC2" "$ACCOUNT_ID" "State=$cgwstate;IP=$cgwip"\n' +
    '      fi\n' +
    '    done\n' +
    '  fi\n' +
    '\n' +
    '  # Virtual Private Gateways\n' +
    '  VGWS=$(aws_retry "aws ec2 describe-vpn-gateways --region $REGION --query \\\"VpnGateways[].{Id:VpnGatewayId,State:State}\\\" --output text" 2>/dev/null)\n' +
    '  if [ $? -eq 0 ] && [ -n "$VGWS" ] && [ "$VGWS" != "None" ]; then\n' +
    '    echo "$VGWS" | while IFS=$\x27\\t\x27 read -r vgwid vgwstate; do\n' +
    '      if [ -n "$vgwid" ]; then\n' +
    '        add_inventory "VirtualPrivateGateway" "$vgwid" "$vgwid" "$REGION" "EC2" "$ACCOUNT_ID" "State=$vgwstate"\n' +
    '      fi\n' +
    '    done\n' +
    '  fi\n' +
    '\n' +
    '  # Direct Connect\n' +
    '  log_info "[$REGION] Collecting Direct Connect connections..."\n' +
    '  DX=$(aws_retry "aws directconnect describe-connections --region $REGION --query \\\"connections[].{Id:connectionId,Name:connectionName,State:connectionState}\\\" --output text" 2>/dev/null)\n' +
    '  DX_RC=$?\n' +
    '  if [ $DX_RC -eq 0 ] && [ -n "$DX" ] && [ "$DX" != "None" ]; then\n' +
    '    echo "$DX" | while IFS=$\x27\\t\x27 read -r dxid dxname dxstate; do\n' +
    '      if [ -n "$dxid" ]; then\n' +
    '        add_inventory "DirectConnect" "$dxid" "$dxname" "$REGION" "DirectConnect" "$ACCOUNT_ID" "State=$dxstate"\n' +
    '      fi\n' +
    '    done\n' +
    '  elif [ $DX_RC -eq 2 ]; then\n' +
    '    log_warn "[$REGION] Permission denied for Direct Connect"\n' +
    '    track_failure "DirectConnect" "$REGION" "Permission denied"\n' +
    '  elif [ $DX_RC -eq 3 ]; then\n' +
    '    log_warn "[$REGION] Direct Connect not available"\n' +
    '    track_failure "DirectConnect" "$REGION" "Service unavailable"\n' +
    '  fi\n' +
    '\n' +
    '  # --- Network Security ---\n' +
    '\n' +
    '  # Security Groups\n' +
    '  log_info "[$REGION] Collecting Security Groups..."\n' +
    '  SGS=$(aws_retry "aws ec2 describe-security-groups --region $REGION --query \\\"SecurityGroups[].{Id:GroupId,Name:GroupName,VpcId:VpcId}\\\" --output text" 2>/dev/null)\n' +
    '  if [ $? -eq 0 ] && [ -n "$SGS" ] && [ "$SGS" != "None" ]; then\n' +
    '    echo "$SGS" | while IFS=$\x27\\t\x27 read -r sgid sgname sgvpc; do\n' +
    '      if [ -n "$sgid" ]; then\n' +
    '        add_inventory "SecurityGroup" "$sgid" "$sgname" "$REGION" "EC2" "$ACCOUNT_ID" "VPC=$sgvpc"\n' +
    '      fi\n' +
    '    done\n' +
    '  fi\n' +
    '\n' +
    '  # NACLs\n' +
    '  log_info "[$REGION] Collecting NACLs..."\n' +
    '  NACLS=$(aws_retry "aws ec2 describe-network-acls --region $REGION --query \\\"NetworkAcls[].{Id:NetworkAclId,VpcId:VpcId}\\\" --output text" 2>/dev/null)\n' +
    '  if [ $? -eq 0 ] && [ -n "$NACLS" ] && [ "$NACLS" != "None" ]; then\n' +
    '    echo "$NACLS" | while IFS=$\x27\\t\x27 read -r naclid naclvpc; do\n' +
    '      if [ -n "$naclid" ]; then\n' +
    '        add_inventory "NetworkACL" "$naclid" "$naclid" "$REGION" "EC2" "$ACCOUNT_ID" "VPC=$naclvpc"\n' +
    '      fi\n' +
    '    done\n' +
    '  fi\n' +
    '\n' +
    '  # Network Firewall\n' +
    '  log_info "[$REGION] Collecting Network Firewall..."\n' +
    '  NFW=$(aws_retry "aws network-firewall list-firewalls --region $REGION --query \\\"Firewalls[].{Name:FirewallName,Arn:FirewallArn}\\\" --output text" 2>/dev/null)\n' +
    '  NFW_RC=$?\n' +
    '  if [ $NFW_RC -eq 0 ] && [ -n "$NFW" ] && [ "$NFW" != "None" ]; then\n' +
    '    echo "$NFW" | while IFS=$\x27\\t\x27 read -r nfwarn nfwname; do\n' +
    '      if [ -n "$nfwarn" ]; then\n' +
    '        add_inventory "NetworkFirewall" "$nfwarn" "$nfwname" "$REGION" "NetworkFirewall" "$ACCOUNT_ID" ""\n' +
    '      fi\n' +
    '    done\n' +
    '  elif [ $NFW_RC -eq 2 ]; then\n' +
    '    log_warn "[$REGION] Permission denied for Network Firewall"\n' +
    '    track_failure "NetworkFirewall" "$REGION" "Permission denied"\n' +
    '  elif [ $NFW_RC -eq 3 ]; then\n' +
    '    log_warn "[$REGION] Network Firewall not available"\n' +
    '    track_failure "NetworkFirewall" "$REGION" "Service unavailable"\n' +
    '  fi\n' +
    '\n' +
    '  # WAF Web ACLs (regional)\n' +
    '  log_info "[$REGION] Collecting WAF Web ACLs..."\n' +
    '  WAF=$(aws_retry "aws wafv2 list-web-acls --region $REGION --scope REGIONAL --query \\\"WebACLs[].{Name:Name,Id:Id,ARN:ARN}\\\" --output text" 2>/dev/null)\n' +
    '  WAF_RC=$?\n' +
    '  if [ $WAF_RC -eq 0 ] && [ -n "$WAF" ] && [ "$WAF" != "None" ]; then\n' +
    '    echo "$WAF" | while IFS=$\x27\\t\x27 read -r wafarn wafid wafname; do\n' +
    '      if [ -n "$wafid" ]; then\n' +
    '        add_inventory "WAFWebACL" "$wafid" "$wafname" "$REGION" "WAF" "$ACCOUNT_ID" "ARN=$wafarn"\n' +
    '      fi\n' +
    '    done\n' +
    '  elif [ $WAF_RC -eq 2 ]; then\n' +
    '    log_warn "[$REGION] Permission denied for WAFv2"\n' +
    '    track_failure "WAFWebACL" "$REGION" "Permission denied"\n' +
    '  elif [ $WAF_RC -eq 3 ]; then\n' +
    '    log_warn "[$REGION] WAFv2 not available"\n' +
    '    track_failure "WAFWebACL" "$REGION" "Service unavailable"\n' +
    '  fi\n' +
    '\n' +
    '  # --- Compute ---\n' +
    '\n' +
    '  # EC2 Instances\n' +
    '  log_info "[$REGION] Collecting EC2 instances..."\n' +
    '  EC2S=$(aws_retry "aws ec2 describe-instances --region $REGION --query \\\"Reservations[].Instances[].{Id:InstanceId,Type:InstanceType,State:State.Name,SubnetId:SubnetId,VpcId:VpcId,SGs:SecurityGroups[].GroupId,Name:Tags[?Key==\\\\\\\"Name\\\\\\\"].Value|[0]}\\\" --output json" 2>/dev/null)\n' +
    '  EC2_RC=$?\n' +
    '  if [ $EC2_RC -eq 0 ] && [ -n "$EC2S" ] && [ "$EC2S" != "[]" ]; then\n' +
    '    EC2_IDS=$(echo "$EC2S" | grep -o \x27\"InstanceId\": \"[^\"]*\"\x27 | sed \x27s/\"InstanceId\": \"//;s/\"//g\x27)\n' +
    '    EC2_COUNT=0\n' +
    '    # Intentional word splitting: EC2_IDS is a space-delimited list from AWS CLI\n' +
    '    for iid in $EC2_IDS; do\n' +
    '      I_TYPE=$(echo "$EC2S" | awk -v id="$iid" \x27BEGIN{RS="\\\\{";FS="\\\\n"} $0~id{for(i=1;i<=NF;i++){if($i~/InstanceType/){gsub(/.*: \"|\".*$/,"",$i);print $i;exit}}}\x27)\n' +
    '      I_STATE=$(echo "$EC2S" | awk -v id="$iid" \x27BEGIN{RS="\\\\{";FS="\\\\n"} $0~id{for(i=1;i<=NF;i++){if($i~/\"State\"/){gsub(/.*: \"|\".*$/,"",$i);print $i;exit}}}\x27)\n' +
    '      I_SUBNET=$(aws_retry "aws ec2 describe-instances --region $REGION --instance-ids $iid --query \\\"Reservations[0].Instances[0].SubnetId\\\" --output text" 2>/dev/null)\n' +
    '      I_VPC=$(aws_retry "aws ec2 describe-instances --region $REGION --instance-ids $iid --query \\\"Reservations[0].Instances[0].VpcId\\\" --output text" 2>/dev/null)\n' +
    '      I_NAME=$(aws_retry "aws ec2 describe-instances --region $REGION --instance-ids $iid --query \\\"Reservations[0].Instances[0].Tags[?Key==\\\\\\\"Name\\\\\\\"].Value|[0]\\\" --output text" 2>/dev/null)\n' +
    '      I_SGS=$(aws_retry "aws ec2 describe-instances --region $REGION --instance-ids $iid --query \\\"Reservations[0].Instances[0].SecurityGroups[].GroupId\\\" --output text" 2>/dev/null)\n' +
    '      I_VOLS=$(aws_retry "aws ec2 describe-instances --region $REGION --instance-ids $iid --query \\\"Reservations[0].Instances[0].BlockDeviceMappings[].Ebs.VolumeId\\\" --output text" 2>/dev/null)\n' +
    '      add_inventory "EC2Instance" "$iid" "${I_NAME:-$iid}" "$REGION" "EC2" "$ACCOUNT_ID" "Type=${I_TYPE:-unknown};State=${I_STATE:-unknown}"\n' +
    '      EC2_COUNT=$((EC2_COUNT + 1))\n' +
    '      # EC2 -> Subnet dependency\n' +
    '      if [ -n "$I_SUBNET" ] && [ "$I_SUBNET" != "None" ]; then\n' +
    '        add_dependency "$I_SUBNET" "Subnet-EC2" "$iid" "$REGION"\n' +
    '      fi\n' +
    '      # EC2 -> Security Group dependencies\n' +
    '      if [ -n "$I_SGS" ] && [ "$I_SGS" != "None" ]; then\n' +
    '        # Intentional word splitting: I_SGS is a space-delimited list from AWS CLI\n' +
    '        for sg in $I_SGS; do\n' +
    '          add_dependency "$iid" "EC2-SecurityGroup" "$sg" "$REGION"\n' +
    '        done\n' +
    '      fi\n' +
    '      # EC2 -> EBS Volume dependencies\n' +
    '      if [ -n "$I_VOLS" ] && [ "$I_VOLS" != "None" ]; then\n' +
    '        # Intentional word splitting: I_VOLS is a space-delimited list from AWS CLI\n' +
    '        for vol in $I_VOLS; do\n' +
    '          add_dependency "$iid" "EC2-EBSVolume" "$vol" "$REGION"\n' +
    '        done\n' +
    '      fi\n' +
    '    done\n' +
    '    log_ok "[$REGION] Found $EC2_COUNT EC2 instances"\n' +
    '  elif [ $EC2_RC -eq 2 ]; then\n' +
    '    log_warn "[$REGION] Permission denied for EC2 instances"\n' +
    '    track_failure "EC2Instance" "$REGION" "Permission denied"\n' +
    '  elif [ $EC2_RC -eq 3 ]; then\n' +
    '    log_warn "[$REGION] EC2 service not available"\n' +
    '    track_failure "EC2Instance" "$REGION" "Service unavailable"\n' +
    '  fi\n' +
    '\n' +
    '  # Auto Scaling Groups\n' +
    '  log_info "[$REGION] Collecting Auto Scaling Groups..."\n' +
    '  ASGS=$(aws_retry "aws autoscaling describe-auto-scaling-groups --region $REGION --query \\\"AutoScalingGroups[].{Name:AutoScalingGroupName,ARN:AutoScalingGroupARN,Min:MinSize,Max:MaxSize,Desired:DesiredCapacity}\\\" --output text" 2>/dev/null)\n' +
    '  if [ $? -eq 0 ] && [ -n "$ASGS" ] && [ "$ASGS" != "None" ]; then\n' +
    '    echo "$ASGS" | while IFS=$\x27\\t\x27 read -r asgarn asgdes asgmax asgmin asgname; do\n' +
    '      if [ -n "$asgname" ]; then\n' +
    '        add_inventory "AutoScalingGroup" "$asgarn" "$asgname" "$REGION" "AutoScaling" "$ACCOUNT_ID" "Min=$asgmin;Max=$asgmax;Desired=$asgdes"\n' +
    '      fi\n' +
    '    done\n' +
    '  fi\n' +
    '\n' +
    '  # Launch Templates\n' +
    '  log_info "[$REGION] Collecting Launch Templates..."\n' +
    '  LTS=$(aws_retry "aws ec2 describe-launch-templates --region $REGION --query \\\"LaunchTemplates[].{Id:LaunchTemplateId,Name:LaunchTemplateName}\\\" --output text" 2>/dev/null)\n' +
    '  if [ $? -eq 0 ] && [ -n "$LTS" ] && [ "$LTS" != "None" ]; then\n' +
    '    echo "$LTS" | while IFS=$\x27\\t\x27 read -r ltid ltname; do\n' +
    '      if [ -n "$ltid" ]; then\n' +
    '        add_inventory "LaunchTemplate" "$ltid" "$ltname" "$REGION" "EC2" "$ACCOUNT_ID" ""\n' +
    '      fi\n' +
    '    done\n' +
    '  fi\n' +
    '\n' +
    '  # Launch Configurations\n' +
    '  log_info "[$REGION] Collecting Launch Configurations..."\n' +
    '  LCS=$(aws_retry "aws autoscaling describe-launch-configurations --region $REGION --query \\\"LaunchConfigurations[].{Name:LaunchConfigurationName,ARN:LaunchConfigurationARN}\\\" --output text" 2>/dev/null)\n' +
    '  if [ $? -eq 0 ] && [ -n "$LCS" ] && [ "$LCS" != "None" ]; then\n' +
    '    echo "$LCS" | while IFS=$\x27\\t\x27 read -r lcarn lcname; do\n' +
    '      if [ -n "$lcname" ]; then\n' +
    '        add_inventory "LaunchConfiguration" "$lcarn" "$lcname" "$REGION" "AutoScaling" "$ACCOUNT_ID" ""\n' +
    '      fi\n' +
    '    done\n' +
    '  fi\n' +
    '\n' +
    '  # --- Load Balancing ---\n' +
    '\n' +
    '  # ALBs and NLBs (ELBv2)\n' +
    '  log_info "[$REGION] Collecting Load Balancers (ALB/NLB)..."\n' +
    '  LBSV2=$(aws_retry "aws elbv2 describe-load-balancers --region $REGION --query \\\"LoadBalancers[].{ARN:LoadBalancerArn,Name:LoadBalancerName,Type:Type,VpcId:VpcId,Scheme:Scheme}\\\" --output text" 2>/dev/null)\n' +
    '  if [ $? -eq 0 ] && [ -n "$LBSV2" ] && [ "$LBSV2" != "None" ]; then\n' +
    '    echo "$LBSV2" | while IFS=$\x27\\t\x27 read -r lbarn lbname lbscheme lbtype lbvpc; do\n' +
    '      if [ -n "$lbarn" ]; then\n' +
    '        add_inventory "LoadBalancer" "$lbarn" "$lbname" "$REGION" "ELBv2" "$ACCOUNT_ID" "Type=$lbtype;Scheme=$lbscheme;VPC=$lbvpc"\n' +
    '        # Listeners\n' +
    '        LISTENERS=$(aws_retry "aws elbv2 describe-listeners --load-balancer-arn \\\"$lbarn\\\" --region $REGION --query \\\"Listeners[].{ARN:ListenerArn,Port:Port,Protocol:Protocol}\\\" --output text" 2>/dev/null)\n' +
    '        if [ $? -eq 0 ] && [ -n "$LISTENERS" ] && [ "$LISTENERS" != "None" ]; then\n' +
    '          echo "$LISTENERS" | while IFS=$\x27\\t\x27 read -r listarn listport listproto; do\n' +
    '            if [ -n "$listarn" ]; then\n' +
    '              add_inventory "LBListener" "$listarn" "${lbname}:${listport}" "$REGION" "ELBv2" "$ACCOUNT_ID" "Port=$listport;Protocol=$listproto"\n' +
    '              add_dependency "$lbarn" "LB-Listener" "$listarn" "$REGION"\n' +
    '              # Target Groups for this listener\n' +
    '              TGS=$(aws_retry "aws elbv2 describe-listeners --listener-arns \\\"$listarn\\\" --region $REGION --query \\\"Listeners[0].DefaultActions[].TargetGroupArn\\\" --output text" 2>/dev/null)\n' +
    '              if [ $? -eq 0 ] && [ -n "$TGS" ] && [ "$TGS" != "None" ]; then\n' +
    '                # Intentional word splitting: TGS is a space-delimited list from AWS CLI\n' +
    '                for tgarn in $TGS; do\n' +
    '                  add_dependency "$listarn" "Listener-TargetGroup" "$tgarn" "$REGION"\n' +
    '                done\n' +
    '              fi\n' +
    '            fi\n' +
    '          done\n' +
    '        fi\n' +
    '      fi\n' +
    '    done\n' +
    '  fi\n' +
    '\n' +
    '  # Target Groups\n' +
    '  log_info "[$REGION] Collecting Target Groups..."\n' +
    '  TGS_ALL=$(aws_retry "aws elbv2 describe-target-groups --region $REGION --query \\\"TargetGroups[].{ARN:TargetGroupArn,Name:TargetGroupName,VpcId:VpcId,Protocol:Protocol,Port:Port}\\\" --output text" 2>/dev/null)\n' +
    '  if [ $? -eq 0 ] && [ -n "$TGS_ALL" ] && [ "$TGS_ALL" != "None" ]; then\n' +
    '    echo "$TGS_ALL" | while IFS=$\x27\\t\x27 read -r tgarn tgname tgport tgproto tgvpc; do\n' +
    '      if [ -n "$tgarn" ]; then\n' +
    '        add_inventory "TargetGroup" "$tgarn" "$tgname" "$REGION" "ELBv2" "$ACCOUNT_ID" "Protocol=$tgproto;Port=$tgport;VPC=$tgvpc"\n' +
    '        # Targets in this target group\n' +
    '        TARGETS=$(aws_retry "aws elbv2 describe-target-health --target-group-arn \\\"$tgarn\\\" --region $REGION --query \\\"TargetHealthDescriptions[].Target.Id\\\" --output text" 2>/dev/null)\n' +
    '        if [ $? -eq 0 ] && [ -n "$TARGETS" ] && [ "$TARGETS" != "None" ]; then\n' +
    '          # Intentional word splitting: TARGETS is a space-delimited list from AWS CLI\n' +
    '          for target in $TARGETS; do\n' +
    '            add_dependency "$tgarn" "TargetGroup-Target" "$target" "$REGION"\n' +
    '          done\n' +
    '        fi\n' +
    '      fi\n' +
    '    done\n' +
    '  fi\n' +
    '\n' +
    '  # Classic Load Balancers\n' +
    '  log_info "[$REGION] Collecting Classic Load Balancers..."\n' +
    '  CLBS=$(aws_retry "aws elb describe-load-balancers --region $REGION --query \\\"LoadBalancerDescriptions[].{Name:LoadBalancerName,DNSName:DNSName,VPCId:VPCId}\\\" --output text" 2>/dev/null)\n' +
    '  if [ $? -eq 0 ] && [ -n "$CLBS" ] && [ "$CLBS" != "None" ]; then\n' +
    '    echo "$CLBS" | while IFS=$\x27\\t\x27 read -r clbdns clbname clbvpc; do\n' +
    '      if [ -n "$clbname" ]; then\n' +
    '        add_inventory "ClassicLoadBalancer" "$clbname" "$clbname" "$REGION" "ELB" "$ACCOUNT_ID" "DNS=$clbdns;VPC=$clbvpc"\n' +
    '      fi\n' +
    '    done\n' +
    '  fi\n' +
    '\n' +
    '  # --- Storage ---\n' +
    '\n' +
    '  # EBS Volumes\n' +
    '  log_info "[$REGION] Collecting EBS Volumes..."\n' +
    '  VOLS=$(aws_retry "aws ec2 describe-volumes --region $REGION --query \\\"Volumes[].{Id:VolumeId,Size:Size,State:State,Type:VolumeType,Encrypted:Encrypted,KmsKeyId:KmsKeyId}\\\" --output text" 2>/dev/null)\n' +
    '  if [ $? -eq 0 ] && [ -n "$VOLS" ] && [ "$VOLS" != "None" ]; then\n' +
    '    echo "$VOLS" | while IFS=$\x27\\t\x27 read -r volenc volid volkms volsize volstate voltype; do\n' +
    '      if [ -n "$volid" ]; then\n' +
    '        add_inventory "EBSVolume" "$volid" "$volid" "$REGION" "EC2" "$ACCOUNT_ID" "Size=${volsize}GB;Type=$voltype;Encrypted=$volenc"\n' +
    '        # KMS dependency for encrypted volumes\n' +
    '        if [ "$volenc" = "True" ] && [ -n "$volkms" ] && [ "$volkms" != "None" ]; then\n' +
    '          add_dependency "$volid" "KMS-EncryptedResource" "$volkms" "$REGION"\n' +
    '        fi\n' +
    '      fi\n' +
    '    done\n' +
    '  fi\n' +
    '\n' +
    '  # EBS Snapshots (owned by this account)\n' +
    '  log_info "[$REGION] Collecting EBS Snapshots..."\n' +
    '  SNAPS=$(aws_retry "aws ec2 describe-snapshots --region $REGION --owner-ids $ACCOUNT_ID --query \\\"Snapshots[].{Id:SnapshotId,VolumeId:VolumeId,Size:VolumeSize,State:State}\\\" --output text" 2>/dev/null)\n' +
    '  if [ $? -eq 0 ] && [ -n "$SNAPS" ] && [ "$SNAPS" != "None" ]; then\n' +
    '    echo "$SNAPS" | while IFS=$\x27\\t\x27 read -r snapid snapsize snapstate snapvol; do\n' +
    '      if [ -n "$snapid" ]; then\n' +
    '        add_inventory "EBSSnapshot" "$snapid" "$snapid" "$REGION" "EC2" "$ACCOUNT_ID" "VolumeId=$snapvol;Size=${snapsize}GB"\n' +
    '      fi\n' +
    '    done\n' +
    '  fi\n' +
    '\n' +
    '  # EFS File Systems\n' +
    '  log_info "[$REGION] Collecting EFS file systems..."\n' +
    '  EFS=$(aws_retry "aws efs describe-file-systems --region $REGION --query \\\"FileSystems[].{Id:FileSystemId,Name:Name,Encrypted:Encrypted,KmsKeyId:KmsKeyId}\\\" --output text" 2>/dev/null)\n' +
    '  EFS_RC=$?\n' +
    '  if [ $EFS_RC -eq 0 ] && [ -n "$EFS" ] && [ "$EFS" != "None" ]; then\n' +
    '    echo "$EFS" | while IFS=$\x27\\t\x27 read -r efsenc efsid efskms efsname; do\n' +
    '      if [ -n "$efsid" ]; then\n' +
    '        add_inventory "EFSFileSystem" "$efsid" "${efsname:-$efsid}" "$REGION" "EFS" "$ACCOUNT_ID" "Encrypted=$efsenc"\n' +
    '        if [ "$efsenc" = "True" ] && [ -n "$efskms" ] && [ "$efskms" != "None" ]; then\n' +
    '          add_dependency "$efsid" "KMS-EncryptedResource" "$efskms" "$REGION"\n' +
    '        fi\n' +
    '      fi\n' +
    '    done\n' +
    '  elif [ $EFS_RC -eq 2 ]; then\n' +
    '    log_warn "[$REGION] Permission denied for EFS"\n' +
    '    track_failure "EFS" "$REGION" "Permission denied"\n' +
    '  elif [ $EFS_RC -eq 3 ]; then\n' +
    '    log_warn "[$REGION] EFS not available"\n' +
    '    track_failure "EFS" "$REGION" "Service unavailable"\n' +
    '  fi\n' +
    '\n' +
    '  # FSx File Systems\n' +
    '  log_info "[$REGION] Collecting FSx file systems..."\n' +
    '  FSX=$(aws_retry "aws fsx describe-file-systems --region $REGION --query \\\"FileSystems[].{Id:FileSystemId,Type:FileSystemType,Storage:StorageCapacity}\\\" --output text" 2>/dev/null)\n' +
    '  FSX_RC=$?\n' +
    '  if [ $FSX_RC -eq 0 ] && [ -n "$FSX" ] && [ "$FSX" != "None" ]; then\n' +
    '    echo "$FSX" | while IFS=$\x27\\t\x27 read -r fsxid fsxstor fsxtype; do\n' +
    '      if [ -n "$fsxid" ]; then\n' +
    '        add_inventory "FSxFileSystem" "$fsxid" "$fsxid" "$REGION" "FSx" "$ACCOUNT_ID" "Type=$fsxtype;Storage=${fsxstor}GB"\n' +
    '      fi\n' +
    '    done\n' +
    '  elif [ $FSX_RC -eq 2 ]; then\n' +
    '    log_warn "[$REGION] Permission denied for FSx"\n' +
    '    track_failure "FSx" "$REGION" "Permission denied"\n' +
    '  elif [ $FSX_RC -eq 3 ]; then\n' +
    '    log_warn "[$REGION] FSx not available"\n' +
    '    track_failure "FSx" "$REGION" "Service unavailable"\n' +
    '  fi\n' +
    '\n' +
    '  # --- Databases ---\n' +
    '\n' +
    '  # RDS Instances\n' +
    '  log_info "[$REGION] Collecting RDS instances..."\n' +
    '  RDS=$(aws_retry "aws rds describe-db-instances --region $REGION --query \\\"DBInstances[].{Id:DBInstanceIdentifier,Engine:Engine,Status:DBInstanceStatus,Class:DBInstanceClass,SubnetGroup:DBSubnetGroup.DBSubnetGroupName,VpcSGs:VpcSecurityGroups[].VpcSecurityGroupId,KmsKeyId:KmsKeyId,Encrypted:StorageEncrypted}\\\" --output text" 2>/dev/null)\n' +
    '  RDS_RC=$?\n' +
    '  if [ $RDS_RC -eq 0 ] && [ -n "$RDS" ] && [ "$RDS" != "None" ]; then\n' +
    '    RDS_IDS=$(aws_retry "aws rds describe-db-instances --region $REGION --query \\\"DBInstances[].DBInstanceIdentifier\\\" --output text" 2>/dev/null)\n' +
    '    RDS_COUNT=0\n' +
    '    # Intentional word splitting: RDS_IDS is a space-delimited list from AWS CLI\n' +
    '    for rdsid in $RDS_IDS; do\n' +
    '      RDS_ENGINE=$(aws_retry "aws rds describe-db-instances --region $REGION --db-instance-identifier \\\"$rdsid\\\" --query \\\"DBInstances[0].Engine\\\" --output text" 2>/dev/null)\n' +
    '      RDS_CLASS=$(aws_retry "aws rds describe-db-instances --region $REGION --db-instance-identifier \\\"$rdsid\\\" --query \\\"DBInstances[0].DBInstanceClass\\\" --output text" 2>/dev/null)\n' +
    '      RDS_SUBGRP=$(aws_retry "aws rds describe-db-instances --region $REGION --db-instance-identifier \\\"$rdsid\\\" --query \\\"DBInstances[0].DBSubnetGroup.DBSubnetGroupName\\\" --output text" 2>/dev/null)\n' +
    '      RDS_SGS=$(aws_retry "aws rds describe-db-instances --region $REGION --db-instance-identifier \\\"$rdsid\\\" --query \\\"DBInstances[0].VpcSecurityGroups[].VpcSecurityGroupId\\\" --output text" 2>/dev/null)\n' +
    '      RDS_KMS=$(aws_retry "aws rds describe-db-instances --region $REGION --db-instance-identifier \\\"$rdsid\\\" --query \\\"DBInstances[0].KmsKeyId\\\" --output text" 2>/dev/null)\n' +
    '      RDS_ENC=$(aws_retry "aws rds describe-db-instances --region $REGION --db-instance-identifier \\\"$rdsid\\\" --query \\\"DBInstances[0].StorageEncrypted\\\" --output text" 2>/dev/null)\n' +
    '      add_inventory "RDSInstance" "$rdsid" "$rdsid" "$REGION" "RDS" "$ACCOUNT_ID" "Engine=$RDS_ENGINE;Class=$RDS_CLASS;Encrypted=$RDS_ENC"\n' +
    '      RDS_COUNT=$((RDS_COUNT + 1))\n' +
    '      # RDS -> Subnet Group dependency\n' +
    '      if [ -n "$RDS_SUBGRP" ] && [ "$RDS_SUBGRP" != "None" ]; then\n' +
    '        add_dependency "$rdsid" "RDS-SubnetGroup" "$RDS_SUBGRP" "$REGION"\n' +
    '      fi\n' +
    '      # RDS -> Security Group dependencies\n' +
    '      if [ -n "$RDS_SGS" ] && [ "$RDS_SGS" != "None" ]; then\n' +
    '        # Intentional word splitting: RDS_SGS is a space-delimited list from AWS CLI\n' +
    '        for rdssg in $RDS_SGS; do\n' +
    '          add_dependency "$rdsid" "RDS-SecurityGroup" "$rdssg" "$REGION"\n' +
    '        done\n' +
    '      fi\n' +
    '      # RDS -> KMS Key dependency\n' +
    '      if [ "$RDS_ENC" = "True" ] && [ -n "$RDS_KMS" ] && [ "$RDS_KMS" != "None" ]; then\n' +
    '        add_dependency "$rdsid" "RDS-KMSKey" "$RDS_KMS" "$REGION"\n' +
    '      fi\n' +
    '    done\n' +
    '    log_ok "[$REGION] Found $RDS_COUNT RDS instances"\n' +
    '  elif [ $RDS_RC -eq 2 ]; then\n' +
    '    log_warn "[$REGION] Permission denied for RDS"\n' +
    '    track_failure "RDSInstance" "$REGION" "Permission denied"\n' +
    '  elif [ $RDS_RC -eq 3 ]; then\n' +
    '    log_warn "[$REGION] RDS service not available"\n' +
    '    track_failure "RDSInstance" "$REGION" "Service unavailable"\n' +
    '  fi\n' +
    '\n' +
    '  # RDS Clusters (Aurora)\n' +
    '  log_info "[$REGION] Collecting RDS/Aurora clusters..."\n' +
    '  CLUSTERS=$(aws_retry "aws rds describe-db-clusters --region $REGION --query \\\"DBClusters[].{Id:DBClusterIdentifier,Engine:Engine,Status:Status,GlobalClusterId:GlobalClusterIdentifier}\\\" --output text" 2>/dev/null)\n' +
    '  if [ $? -eq 0 ] && [ -n "$CLUSTERS" ] && [ "$CLUSTERS" != "None" ]; then\n' +
    '    echo "$CLUSTERS" | while IFS=$\x27\\t\x27 read -r cleng clglobal clid clstatus; do\n' +
    '      if [ -n "$clid" ]; then\n' +
    '        add_inventory "RDSCluster" "$clid" "$clid" "$REGION" "RDS" "$ACCOUNT_ID" "Engine=$cleng;Status=$clstatus"\n' +
    '        # Aurora -> Global Cluster dependency\n' +
    '        if [ -n "$clglobal" ] && [ "$clglobal" != "None" ]; then\n' +
    '          add_dependency "$clid" "Aurora-GlobalCluster" "$clglobal" "$REGION"\n' +
    '        fi\n' +
    '      fi\n' +
    '    done\n' +
    '  fi\n' +
    '\n' +
    '  # RDS Snapshots\n' +
    '  log_info "[$REGION] Collecting RDS snapshots..."\n' +
    '  RDS_SNAPS=$(aws_retry "aws rds describe-db-snapshots --region $REGION --query \\\"DBSnapshots[?DBSnapshotIdentifier!=null].{Id:DBSnapshotIdentifier,DBId:DBInstanceIdentifier,Status:Status,Engine:Engine}\\\" --output text" 2>/dev/null)\n' +
    '  if [ $? -eq 0 ] && [ -n "$RDS_SNAPS" ] && [ "$RDS_SNAPS" != "None" ]; then\n' +
    '    echo "$RDS_SNAPS" | while IFS=$\x27\\t\x27 read -r rsdbid rseng rsid rsstatus; do\n' +
    '      if [ -n "$rsid" ]; then\n' +
    '        add_inventory "RDSSnapshot" "$rsid" "$rsid" "$REGION" "RDS" "$ACCOUNT_ID" "DBInstance=$rsdbid;Engine=$rseng"\n' +
    '      fi\n' +
    '    done\n' +
    '  fi\n' +
    '\n' +
    '  # Aurora Global Clusters (only in primary region, but collect everywhere to catch)\n' +
    '  GLOBAL_CL=$(aws_retry "aws rds describe-global-clusters --region $REGION --query \\\"GlobalClusters[].{Id:GlobalClusterIdentifier,Engine:Engine,Status:Status}\\\" --output text" 2>/dev/null)\n' +
    '  if [ $? -eq 0 ] && [ -n "$GLOBAL_CL" ] && [ "$GLOBAL_CL" != "None" ]; then\n' +
    '    echo "$GLOBAL_CL" | while IFS=$\x27\\t\x27 read -r gceng gcid gcstatus; do\n' +
    '      if [ -n "$gcid" ]; then\n' +
    '        add_inventory "AuroraGlobalCluster" "$gcid" "$gcid" "$REGION" "RDS" "$ACCOUNT_ID" "Engine=$gceng;Status=$gcstatus"\n' +
    '      fi\n' +
    '    done\n' +
    '  fi\n' +
    '\n' +
    '  # DynamoDB Tables\n' +
    '  log_info "[$REGION] Collecting DynamoDB tables..."\n' +
    '  DDB=$(aws_retry "aws dynamodb list-tables --region $REGION --query \\\"TableNames\\\" --output text" 2>/dev/null)\n' +
    '  DDB_RC=$?\n' +
    '  if [ $DDB_RC -eq 0 ] && [ -n "$DDB" ] && [ "$DDB" != "None" ]; then\n' +
    '    DDB_COUNT=0\n' +
    '    # Intentional word splitting: DDB is a space-delimited list from AWS CLI\n' +
    '    for tbl in $DDB; do\n' +
    '      TBL_STATUS=$(aws_retry "aws dynamodb describe-table --region $REGION --table-name \\\"$tbl\\\" --query \\\"Table.TableStatus\\\" --output text" 2>/dev/null)\n' +
    '      TBL_SIZE=$(aws_retry "aws dynamodb describe-table --region $REGION --table-name \\\"$tbl\\\" --query \\\"Table.TableSizeBytes\\\" --output text" 2>/dev/null)\n' +
    '      add_inventory "DynamoDBTable" "$tbl" "$tbl" "$REGION" "DynamoDB" "$ACCOUNT_ID" "Status=$TBL_STATUS;SizeBytes=$TBL_SIZE"\n' +
    '      DDB_COUNT=$((DDB_COUNT + 1))\n' +
    '    done\n' +
    '    log_ok "[$REGION] Found $DDB_COUNT DynamoDB tables"\n' +
    '  elif [ $DDB_RC -eq 2 ]; then\n' +
    '    log_warn "[$REGION] Permission denied for DynamoDB"\n' +
    '    track_failure "DynamoDB" "$REGION" "Permission denied"\n' +
    '  elif [ $DDB_RC -eq 3 ]; then\n' +
    '    log_warn "[$REGION] DynamoDB service not available"\n' +
    '    track_failure "DynamoDB" "$REGION" "Service unavailable"\n' +
    '  fi\n' +
    '\n' +
    '  # --- Containers ---\n' +
    '\n' +
    '  # EKS Clusters\n' +
    '  log_info "[$REGION] Collecting EKS clusters..."\n' +
    '  EKS=$(aws_retry "aws eks list-clusters --region $REGION --query \\\"clusters\\\" --output text" 2>/dev/null)\n' +
    '  EKS_RC=$?\n' +
    '  if [ $EKS_RC -eq 0 ] && [ -n "$EKS" ] && [ "$EKS" != "None" ]; then\n' +
    '    # Intentional word splitting: EKS is a space-delimited list from AWS CLI\n' +
    '    for eksname in $EKS; do\n' +
    '      EKS_VPC=$(aws_retry "aws eks describe-cluster --region $REGION --name \\\"$eksname\\\" --query \\\"cluster.resourcesVpcConfig.vpcId\\\" --output text" 2>/dev/null)\n' +
    '      EKS_SUBNETS=$(aws_retry "aws eks describe-cluster --region $REGION --name \\\"$eksname\\\" --query \\\"cluster.resourcesVpcConfig.subnetIds\\\" --output text" 2>/dev/null)\n' +
    '      EKS_SGS=$(aws_retry "aws eks describe-cluster --region $REGION --name \\\"$eksname\\\" --query \\\"cluster.resourcesVpcConfig.securityGroupIds\\\" --output text" 2>/dev/null)\n' +
    '      add_inventory "EKSCluster" "$eksname" "$eksname" "$REGION" "EKS" "$ACCOUNT_ID" "VPC=$EKS_VPC"\n' +
    '      # EKS -> Subnet dependencies\n' +
    '      if [ -n "$EKS_SUBNETS" ] && [ "$EKS_SUBNETS" != "None" ]; then\n' +
    '        # Intentional word splitting: EKS_SUBNETS is a space-delimited list from AWS CLI\n' +
    '        for eksub in $EKS_SUBNETS; do\n' +
    '          add_dependency "$eksname" "EKS-Subnet" "$eksub" "$REGION"\n' +
    '        done\n' +
    '      fi\n' +
    '      # EKS -> Security Group dependencies\n' +
    '      if [ -n "$EKS_SGS" ] && [ "$EKS_SGS" != "None" ]; then\n' +
    '        # Intentional word splitting: EKS_SGS is a space-delimited list from AWS CLI\n' +
    '        for eksg in $EKS_SGS; do\n' +
    '          add_dependency "$eksname" "EKS-SecurityGroup" "$eksg" "$REGION"\n' +
    '        done\n' +
    '      fi\n' +
    '    done\n' +
    '  elif [ $EKS_RC -eq 2 ]; then\n' +
    '    log_warn "[$REGION] Permission denied for EKS"\n' +
    '    track_failure "EKS" "$REGION" "Permission denied"\n' +
    '  elif [ $EKS_RC -eq 3 ]; then\n' +
    '    log_warn "[$REGION] EKS not available"\n' +
    '    track_failure "EKS" "$REGION" "Service unavailable"\n' +
    '  fi\n' +
    '\n' +
    '  # ECS Clusters\n' +
    '  log_info "[$REGION] Collecting ECS clusters..."\n' +
    '  ECS=$(aws_retry "aws ecs list-clusters --region $REGION --query \\\"clusterArns\\\" --output text" 2>/dev/null)\n' +
    '  ECS_RC=$?\n' +
    '  if [ $ECS_RC -eq 0 ] && [ -n "$ECS" ] && [ "$ECS" != "None" ]; then\n' +
    '    # Intentional word splitting: ECS is a space-delimited list from AWS CLI\n' +
    '    for ecsarn in $ECS; do\n' +
    '      ECS_NAME=$(aws_retry "aws ecs describe-clusters --region $REGION --clusters \\\"$ecsarn\\\" --query \\\"clusters[0].clusterName\\\" --output text" 2>/dev/null)\n' +
    '      ECS_STATUS=$(aws_retry "aws ecs describe-clusters --region $REGION --clusters \\\"$ecsarn\\\" --query \\\"clusters[0].status\\\" --output text" 2>/dev/null)\n' +
    '      add_inventory "ECSCluster" "$ecsarn" "${ECS_NAME:-$ecsarn}" "$REGION" "ECS" "$ACCOUNT_ID" "Status=$ECS_STATUS"\n' +
    '      # ECS services -> subnets, SGs, target groups\n' +
    '      ECS_SVCS=$(aws_retry "aws ecs list-services --region $REGION --cluster \\\"$ecsarn\\\" --query \\\"serviceArns\\\" --output text" 2>/dev/null)\n' +
    '      if [ $? -eq 0 ] && [ -n "$ECS_SVCS" ] && [ "$ECS_SVCS" != "None" ]; then\n' +
    '        # Intentional word splitting: ECS_SVCS is a space-delimited list from AWS CLI\n' +
    '        for ecssvc in $ECS_SVCS; do\n' +
    '          SVC_SUBNETS=$(aws_retry "aws ecs describe-services --region $REGION --cluster \\\"$ecsarn\\\" --services \\\"$ecssvc\\\" --query \\\"services[0].networkConfiguration.awsvpcConfiguration.subnets\\\" --output text" 2>/dev/null)\n' +
    '          SVC_SGS=$(aws_retry "aws ecs describe-services --region $REGION --cluster \\\"$ecsarn\\\" --services \\\"$ecssvc\\\" --query \\\"services[0].networkConfiguration.awsvpcConfiguration.securityGroups\\\" --output text" 2>/dev/null)\n' +
    '          SVC_TGS=$(aws_retry "aws ecs describe-services --region $REGION --cluster \\\"$ecsarn\\\" --services \\\"$ecssvc\\\" --query \\\"services[0].loadBalancers[].targetGroupArn\\\" --output text" 2>/dev/null)\n' +
    '          if [ -n "$SVC_SUBNETS" ] && [ "$SVC_SUBNETS" != "None" ]; then\n' +
    '            # Intentional word splitting: SVC_SUBNETS is a space-delimited list from AWS CLI\n' +
    '            for ecssub in $SVC_SUBNETS; do\n' +
    '              add_dependency "$ecsarn" "ECS-Subnet" "$ecssub" "$REGION"\n' +
    '            done\n' +
    '          fi\n' +
    '          if [ -n "$SVC_SGS" ] && [ "$SVC_SGS" != "None" ]; then\n' +
    '            # Intentional word splitting: SVC_SGS is a space-delimited list from AWS CLI\n' +
    '            for ecssg in $SVC_SGS; do\n' +
    '              add_dependency "$ecsarn" "ECS-SecurityGroup" "$ecssg" "$REGION"\n' +
    '            done\n' +
    '          fi\n' +
    '          if [ -n "$SVC_TGS" ] && [ "$SVC_TGS" != "None" ]; then\n' +
    '            # Intentional word splitting: SVC_TGS is a space-delimited list from AWS CLI\n' +
    '            for ecstg in $SVC_TGS; do\n' +
    '              add_dependency "$ecsarn" "ECS-TargetGroup" "$ecstg" "$REGION"\n' +
    '            done\n' +
    '          fi\n' +
    '        done\n' +
    '      fi\n' +
    '    done\n' +
    '  elif [ $ECS_RC -eq 2 ]; then\n' +
    '    log_warn "[$REGION] Permission denied for ECS"\n' +
    '    track_failure "ECS" "$REGION" "Permission denied"\n' +
    '  elif [ $ECS_RC -eq 3 ]; then\n' +
    '    log_warn "[$REGION] ECS not available"\n' +
    '    track_failure "ECS" "$REGION" "Service unavailable"\n' +
    '  fi\n' +
    '\n' +
    '  # --- Serverless ---\n' +
    '\n' +
    '  # Lambda Functions\n' +
    '  log_info "[$REGION] Collecting Lambda functions..."\n' +
    '  LAMBDAS=$(aws_retry "aws lambda list-functions --region $REGION --query \\\"Functions[].{Name:FunctionName,ARN:FunctionArn,Runtime:Runtime,Role:Role}\\\" --output text" 2>/dev/null)\n' +
    '  LAMBDA_RC=$?\n' +
    '  if [ $LAMBDA_RC -eq 0 ] && [ -n "$LAMBDAS" ] && [ "$LAMBDAS" != "None" ]; then\n' +
    '    LAMBDA_NAMES=$(aws_retry "aws lambda list-functions --region $REGION --query \\\"Functions[].FunctionName\\\" --output text" 2>/dev/null)\n' +
    '    LAMBDA_COUNT=0\n' +
    '    # Intentional word splitting: LAMBDA_NAMES is a space-delimited list from AWS CLI\n' +
    '    for lfn in $LAMBDA_NAMES; do\n' +
    '      LF_RUNTIME=$(aws_retry "aws lambda get-function-configuration --region $REGION --function-name \\\"$lfn\\\" --query \\\"Runtime\\\" --output text" 2>/dev/null)\n' +
    '      LF_ROLE=$(aws_retry "aws lambda get-function-configuration --region $REGION --function-name \\\"$lfn\\\" --query \\\"Role\\\" --output text" 2>/dev/null)\n' +
    '      LF_VPC=$(aws_retry "aws lambda get-function-configuration --region $REGION --function-name \\\"$lfn\\\" --query \\\"VpcConfig.VpcId\\\" --output text" 2>/dev/null)\n' +
    '      LF_SUBNETS=$(aws_retry "aws lambda get-function-configuration --region $REGION --function-name \\\"$lfn\\\" --query \\\"VpcConfig.SubnetIds\\\" --output text" 2>/dev/null)\n' +
    '      LF_SGS=$(aws_retry "aws lambda get-function-configuration --region $REGION --function-name \\\"$lfn\\\" --query \\\"VpcConfig.SecurityGroupIds\\\" --output text" 2>/dev/null)\n' +
    '      add_inventory "LambdaFunction" "$lfn" "$lfn" "$REGION" "Lambda" "$ACCOUNT_ID" "Runtime=$LF_RUNTIME"\n' +
    '      LAMBDA_COUNT=$((LAMBDA_COUNT + 1))\n' +
    '      # Lambda -> IAM Role dependency\n' +
    '      if [ -n "$LF_ROLE" ] && [ "$LF_ROLE" != "None" ]; then\n' +
    '        add_dependency "$lfn" "Lambda-IAMRole" "$LF_ROLE" "$REGION"\n' +
    '      fi\n' +
    '      # Lambda -> VPC/Subnet/SG dependencies\n' +
    '      if [ -n "$LF_VPC" ] && [ "$LF_VPC" != "None" ] && [ "$LF_VPC" != "" ]; then\n' +
    '        add_dependency "$lfn" "Lambda-VPC" "$LF_VPC" "$REGION"\n' +
    '        if [ -n "$LF_SUBNETS" ] && [ "$LF_SUBNETS" != "None" ]; then\n' +
    '          # Intentional word splitting: LF_SUBNETS is a space-delimited list from AWS CLI\n' +
    '          for lsub in $LF_SUBNETS; do\n' +
    '            add_dependency "$lfn" "Lambda-Subnet" "$lsub" "$REGION"\n' +
    '          done\n' +
    '        fi\n' +
    '        if [ -n "$LF_SGS" ] && [ "$LF_SGS" != "None" ]; then\n' +
    '          # Intentional word splitting: LF_SGS is a space-delimited list from AWS CLI\n' +
    '          for lsg in $LF_SGS; do\n' +
    '            add_dependency "$lfn" "Lambda-SecurityGroup" "$lsg" "$REGION"\n' +
    '          done\n' +
    '        fi\n' +
    '      fi\n' +
    '    done\n' +
    '    log_ok "[$REGION] Found $LAMBDA_COUNT Lambda functions"\n' +
    '  elif [ $LAMBDA_RC -eq 2 ]; then\n' +
    '    log_warn "[$REGION] Permission denied for Lambda"\n' +
    '    track_failure "Lambda" "$REGION" "Permission denied"\n' +
    '  elif [ $LAMBDA_RC -eq 3 ]; then\n' +
    '    log_warn "[$REGION] Lambda service not available"\n' +
    '    track_failure "Lambda" "$REGION" "Service unavailable"\n' +
    '  fi\n' +
    '\n' +
    '  # --- Integration Services ---\n' +
    '\n' +
    '  # SQS Queues\n' +
    '  log_info "[$REGION] Collecting SQS queues..."\n' +
    '  SQS=$(aws_retry "aws sqs list-queues --region $REGION --query \\\"QueueUrls\\\" --output text" 2>/dev/null)\n' +
    '  SQS_RC=$?\n' +
    '  if [ $SQS_RC -eq 0 ] && [ -n "$SQS" ] && [ "$SQS" != "None" ]; then\n' +
    '    # Intentional word splitting: SQS is a space-delimited list from AWS CLI\n' +
    '    for sqsurl in $SQS; do\n' +
    '      SQS_NAME=$(echo "$sqsurl" | awk -F/ \x27{print $NF}\x27)\n' +
    '      add_inventory "SQSQueue" "$sqsurl" "$SQS_NAME" "$REGION" "SQS" "$ACCOUNT_ID" ""\n' +
    '    done\n' +
    '  elif [ $SQS_RC -eq 2 ]; then\n' +
    '    log_warn "[$REGION] Permission denied for SQS"\n' +
    '    track_failure "SQS" "$REGION" "Permission denied"\n' +
    '  elif [ $SQS_RC -eq 3 ]; then\n' +
    '    log_warn "[$REGION] SQS not available"\n' +
    '    track_failure "SQS" "$REGION" "Service unavailable"\n' +
    '  fi\n' +
    '\n' +
    '  # SNS Topics\n' +
    '  log_info "[$REGION] Collecting SNS topics..."\n' +
    '  SNS=$(aws_retry "aws sns list-topics --region $REGION --query \\\"Topics[].TopicArn\\\" --output text" 2>/dev/null)\n' +
    '  SNS_RC=$?\n' +
    '  if [ $SNS_RC -eq 0 ] && [ -n "$SNS" ] && [ "$SNS" != "None" ]; then\n' +
    '    # Intentional word splitting: SNS is a space-delimited list from AWS CLI\n' +
    '    for snsarn in $SNS; do\n' +
    '      SNS_NAME=$(echo "$snsarn" | awk -F: \x27{print $NF}\x27)\n' +
    '      add_inventory "SNSTopic" "$snsarn" "$SNS_NAME" "$REGION" "SNS" "$ACCOUNT_ID" ""\n' +
    '    done\n' +
    '  elif [ $SNS_RC -eq 2 ]; then\n' +
    '    log_warn "[$REGION] Permission denied for SNS"\n' +
    '    track_failure "SNS" "$REGION" "Permission denied"\n' +
    '  elif [ $SNS_RC -eq 3 ]; then\n' +
    '    log_warn "[$REGION] SNS not available"\n' +
    '    track_failure "SNS" "$REGION" "Service unavailable"\n' +
    '  fi\n' +
    '\n' +
    '  # EventBridge Rules\n' +
    '  log_info "[$REGION] Collecting EventBridge rules..."\n' +
    '  EB_RULES=$(aws_retry "aws events list-rules --region $REGION --query \\\"Rules[].{Name:Name,Arn:Arn,State:State}\\\" --output text" 2>/dev/null)\n' +
    '  EB_RC=$?\n' +
    '  if [ $EB_RC -eq 0 ] && [ -n "$EB_RULES" ] && [ "$EB_RULES" != "None" ]; then\n' +
    '    echo "$EB_RULES" | while IFS=$\x27\\t\x27 read -r ebarn ebname ebstate; do\n' +
    '      if [ -n "$ebname" ]; then\n' +
    '        add_inventory "EventBridgeRule" "$ebarn" "$ebname" "$REGION" "EventBridge" "$ACCOUNT_ID" "State=$ebstate"\n' +
    '      fi\n' +
    '    done\n' +
    '  elif [ $EB_RC -eq 2 ]; then\n' +
    '    log_warn "[$REGION] Permission denied for EventBridge"\n' +
    '    track_failure "EventBridge" "$REGION" "Permission denied"\n' +
    '  elif [ $EB_RC -eq 3 ]; then\n' +
    '    log_warn "[$REGION] EventBridge not available"\n' +
    '    track_failure "EventBridge" "$REGION" "Service unavailable"\n' +
    '  fi\n' +
    '\n' +
    '  # --- Backup/DR ---\n' +
    '\n' +
    '  # AWS Backup Vaults\n' +
    '  log_info "[$REGION] Collecting AWS Backup vaults..."\n' +
    '  BK_VAULTS=$(aws_retry "aws backup list-backup-vaults --region $REGION --query \\\"BackupVaultList[].{Name:BackupVaultName,ARN:BackupVaultArn}\\\" --output text" 2>/dev/null)\n' +
    '  BK_RC=$?\n' +
    '  if [ $BK_RC -eq 0 ] && [ -n "$BK_VAULTS" ] && [ "$BK_VAULTS" != "None" ]; then\n' +
    '    echo "$BK_VAULTS" | while IFS=$\x27\\t\x27 read -r bkvarn bkvname; do\n' +
    '      if [ -n "$bkvname" ]; then\n' +
    '        add_inventory "BackupVault" "$bkvarn" "$bkvname" "$REGION" "Backup" "$ACCOUNT_ID" ""\n' +
    '        # Recovery Points in this vault\n' +
    '        RP=$(aws_retry "aws backup list-recovery-points-by-backup-vault --region $REGION --backup-vault-name \\\"$bkvname\\\" --query \\\"RecoveryPoints[].{ARN:RecoveryPointArn,ResourceARN:ResourceArn,Status:Status}\\\" --output text" 2>/dev/null)\n' +
    '        if [ $? -eq 0 ] && [ -n "$RP" ] && [ "$RP" != "None" ]; then\n' +
    '          echo "$RP" | while IFS=$\x27\\t\x27 read -r rparn rpresource rpstatus; do\n' +
    '            if [ -n "$rparn" ]; then\n' +
    '              add_inventory "BackupRecoveryPoint" "$rparn" "$rparn" "$REGION" "Backup" "$ACCOUNT_ID" "Status=$rpstatus;Source=$rpresource"\n' +
    '              add_dependency "$bkvarn" "BackupVault-RecoveryPoint" "$rparn" "$REGION"\n' +
    '              if [ -n "$rpresource" ] && [ "$rpresource" != "None" ]; then\n' +
    '                add_dependency "$rparn" "RecoveryPoint-SourceResource" "$rpresource" "$REGION"\n' +
    '              fi\n' +
    '            fi\n' +
    '          done\n' +
    '        fi\n' +
    '      fi\n' +
    '    done\n' +
    '  elif [ $BK_RC -eq 2 ]; then\n' +
    '    log_warn "[$REGION] Permission denied for AWS Backup"\n' +
    '    track_failure "Backup" "$REGION" "Permission denied"\n' +
    '  elif [ $BK_RC -eq 3 ]; then\n' +
    '    log_warn "[$REGION] AWS Backup not available"\n' +
    '    track_failure "Backup" "$REGION" "Service unavailable"\n' +
    '  fi\n' +
    '\n' +
    '  # AWS Backup Plans\n' +
    '  log_info "[$REGION] Collecting AWS Backup plans..."\n' +
    '  BK_PLANS=$(aws_retry "aws backup list-backup-plans --region $REGION --query \\\"BackupPlansList[].{Id:BackupPlanId,Name:BackupPlanName,ARN:BackupPlanArn}\\\" --output text" 2>/dev/null)\n' +
    '  if [ $? -eq 0 ] && [ -n "$BK_PLANS" ] && [ "$BK_PLANS" != "None" ]; then\n' +
    '    echo "$BK_PLANS" | while IFS=$\x27\\t\x27 read -r bkparn bkpid bkpname; do\n' +
    '      if [ -n "$bkpid" ]; then\n' +
    '        add_inventory "BackupPlan" "$bkparn" "$bkpname" "$REGION" "Backup" "$ACCOUNT_ID" ""\n' +
    '      fi\n' +
    '    done\n' +
    '  fi\n' +
    '\n' +
    '  # --- Data Migration (DMS) ---\n' +
    '\n' +
    '  # DMS Replication Instances\n' +
    '  log_info "[$REGION] Collecting DMS replication instances..."\n' +
    '  DMS_RI=$(aws_retry "aws dms describe-replication-instances --region $REGION --query \\\"ReplicationInstances[].{Id:ReplicationInstanceIdentifier,ARN:ReplicationInstanceArn,Class:ReplicationInstanceClass,Status:ReplicationInstanceStatus}\\\" --output text" 2>/dev/null)\n' +
    '  DMS_RC=$?\n' +
    '  if [ $DMS_RC -eq 0 ] && [ -n "$DMS_RI" ] && [ "$DMS_RI" != "None" ]; then\n' +
    '    echo "$DMS_RI" | while IFS=$\x27\\t\x27 read -r dmsarn dmsclass dmsid dmsstatus; do\n' +
    '      if [ -n "$dmsid" ]; then\n' +
    '        add_inventory "DMSReplicationInstance" "$dmsarn" "$dmsid" "$REGION" "DMS" "$ACCOUNT_ID" "Class=$dmsclass;Status=$dmsstatus"\n' +
    '      fi\n' +
    '    done\n' +
    '  elif [ $DMS_RC -eq 2 ]; then\n' +
    '    log_warn "[$REGION] Permission denied for DMS"\n' +
    '    track_failure "DMS" "$REGION" "Permission denied"\n' +
    '  elif [ $DMS_RC -eq 3 ]; then\n' +
    '    log_warn "[$REGION] DMS not available"\n' +
    '    track_failure "DMS" "$REGION" "Service unavailable"\n' +
    '  fi\n' +
    '\n' +
    '  # DMS Replication Tasks\n' +
    '  log_info "[$REGION] Collecting DMS replication tasks..."\n' +
    '  DMS_TASKS=$(aws_retry "aws dms describe-replication-tasks --region $REGION --query \\\"ReplicationTasks[].{Id:ReplicationTaskIdentifier,ARN:ReplicationTaskArn,SourceEP:SourceEndpointArn,TargetEP:TargetEndpointArn,ReplInstARN:ReplicationInstanceArn,Status:Status}\\\" --output text" 2>/dev/null)\n' +
    '  if [ $? -eq 0 ] && [ -n "$DMS_TASKS" ] && [ "$DMS_TASKS" != "None" ]; then\n' +
    '    echo "$DMS_TASKS" | while IFS=$\x27\\t\x27 read -r dtarn dtid dtreplarn dtsrcarn dtstatus dttgtarn; do\n' +
    '      if [ -n "$dtid" ]; then\n' +
    '        add_inventory "DMSReplicationTask" "$dtarn" "$dtid" "$REGION" "DMS" "$ACCOUNT_ID" "Status=$dtstatus"\n' +
    '        # DMS Task -> Source Endpoint\n' +
    '        if [ -n "$dtsrcarn" ] && [ "$dtsrcarn" != "None" ]; then\n' +
    '          add_dependency "$dtarn" "DMSTask-SourceEndpoint" "$dtsrcarn" "$REGION"\n' +
    '        fi\n' +
    '        # DMS Task -> Target Endpoint\n' +
    '        if [ -n "$dttgtarn" ] && [ "$dttgtarn" != "None" ]; then\n' +
    '          add_dependency "$dtarn" "DMSTask-TargetEndpoint" "$dttgtarn" "$REGION"\n' +
    '        fi\n' +
    '        # DMS Task -> Replication Instance\n' +
    '        if [ -n "$dtreplarn" ] && [ "$dtreplarn" != "None" ]; then\n' +
    '          add_dependency "$dtarn" "DMSTask-ReplicationInstance" "$dtreplarn" "$REGION"\n' +
    '        fi\n' +
    '      fi\n' +
    '    done\n' +
    '  fi\n' +
    '\n' +
    '  # DMS Endpoints (source and target)\n' +
    '  log_info "[$REGION] Collecting DMS endpoints..."\n' +
    '  DMS_EP=$(aws_retry "aws dms describe-endpoints --region $REGION --query \\\"Endpoints[].{Id:EndpointIdentifier,ARN:EndpointArn,Type:EndpointType,Engine:EngineName}\\\" --output text" 2>/dev/null)\n' +
    '  if [ $? -eq 0 ] && [ -n "$DMS_EP" ] && [ "$DMS_EP" != "None" ]; then\n' +
    '    echo "$DMS_EP" | while IFS=$\x27\\t\x27 read -r eparn epeng epid eptype; do\n' +
    '      if [ -n "$epid" ]; then\n' +
    '        add_inventory "DMSEndpoint" "$eparn" "$epid" "$REGION" "DMS" "$ACCOUNT_ID" "Type=$eptype;Engine=$epeng"\n' +
    '      fi\n' +
    '    done\n' +
    '  fi\n' +
    '\n' +
    '  # --- Security/Encryption ---\n' +
    '\n' +
    '  # KMS Keys\n' +
    '  log_info "[$REGION] Collecting KMS keys..."\n' +
    '  KMS_KEYS=$(aws_retry "aws kms list-keys --region $REGION --query \\\"Keys[].KeyId\\\" --output text" 2>/dev/null)\n' +
    '  KMS_RC=$?\n' +
    '  if [ $KMS_RC -eq 0 ] && [ -n "$KMS_KEYS" ] && [ "$KMS_KEYS" != "None" ]; then\n' +
    '    # Intentional word splitting: KMS_KEYS is a space-delimited list from AWS CLI\n' +
    '    for kmsid in $KMS_KEYS; do\n' +
    '      KMS_DESC=$(aws_retry "aws kms describe-key --region $REGION --key-id \\\"$kmsid\\\" --query \\\"KeyMetadata.{State:KeyState,Manager:KeyManager,Desc:Description}\\\" --output text" 2>/dev/null)\n' +
    '      KMS_STATE=$(echo "$KMS_DESC" | awk \x27{print $1}\x27)\n' +
    '      KMS_MGR=$(echo "$KMS_DESC" | awk \x27{print $2}\x27)\n' +
    '      if [ "$KMS_MGR" = "CUSTOMER" ]; then\n' +
    '        add_inventory "KMSKey" "$kmsid" "$kmsid" "$REGION" "KMS" "$ACCOUNT_ID" "State=$KMS_STATE;Manager=$KMS_MGR"\n' +
    '      fi\n' +
    '    done\n' +
    '  elif [ $KMS_RC -eq 2 ]; then\n' +
    '    log_warn "[$REGION] Permission denied for KMS"\n' +
    '    track_failure "KMS" "$REGION" "Permission denied"\n' +
    '  elif [ $KMS_RC -eq 3 ]; then\n' +
    '    log_warn "[$REGION] KMS service not available"\n' +
    '    track_failure "KMS" "$REGION" "Service unavailable"\n' +
    '  fi\n' +
    '\n' +
    '  # ACM Certificates\n' +
    '  log_info "[$REGION] Collecting ACM certificates..."\n' +
    '  ACM=$(aws_retry "aws acm list-certificates --region $REGION --query \\\"CertificateSummaryList[].{ARN:CertificateArn,Domain:DomainName,Status:Status}\\\" --output text" 2>/dev/null)\n' +
    '  ACM_RC=$?\n' +
    '  if [ $ACM_RC -eq 0 ] && [ -n "$ACM" ] && [ "$ACM" != "None" ]; then\n' +
    '    echo "$ACM" | while IFS=$\x27\\t\x27 read -r acmarn acmdomain acmstatus; do\n' +
    '      if [ -n "$acmarn" ]; then\n' +
    '        add_inventory "ACMCertificate" "$acmarn" "$acmdomain" "$REGION" "ACM" "$ACCOUNT_ID" "Status=$acmstatus"\n' +
    '      fi\n' +
    '    done\n' +
    '  elif [ $ACM_RC -eq 2 ]; then\n' +
    '    log_warn "[$REGION] Permission denied for ACM"\n' +
    '    track_failure "ACM" "$REGION" "Permission denied"\n' +
    '  elif [ $ACM_RC -eq 3 ]; then\n' +
    '    log_warn "[$REGION] ACM not available"\n' +
    '    track_failure "ACM" "$REGION" "Service unavailable"\n' +
    '  fi\n' +
    '\n' +
    '  # SSM Parameter Store (metadata only)\n' +
    '  log_info "[$REGION] Collecting SSM parameters (metadata)..."\n' +
    '  SSM_PARAMS=$(aws_retry "aws ssm describe-parameters --region $REGION --query \\\"Parameters[].{Name:Name,Type:Type,LastModified:LastModifiedDate}\\\" --output text" 2>/dev/null)\n' +
    '  SSM_RC=$?\n' +
    '  if [ $SSM_RC -eq 0 ] && [ -n "$SSM_PARAMS" ] && [ "$SSM_PARAMS" != "None" ]; then\n' +
    '    echo "$SSM_PARAMS" | while IFS=$\x27\\t\x27 read -r ssmlm ssmname ssmtype; do\n' +
    '      if [ -n "$ssmname" ]; then\n' +
    '        add_inventory "SSMParameter" "$ssmname" "$ssmname" "$REGION" "SSM" "$ACCOUNT_ID" "Type=$ssmtype"\n' +
    '      fi\n' +
    '    done\n' +
    '  elif [ $SSM_RC -eq 2 ]; then\n' +
    '    log_warn "[$REGION] Permission denied for SSM"\n' +
    '    track_failure "SSMParameter" "$REGION" "Permission denied"\n' +
    '  elif [ $SSM_RC -eq 3 ]; then\n' +
    '    log_warn "[$REGION] SSM service not available"\n' +
    '    track_failure "SSMParameter" "$REGION" "Service unavailable"\n' +
    '  fi\n' +
    '\n' +
    '  # Secrets Manager (metadata only)\n' +
    '  log_info "[$REGION] Collecting Secrets Manager secrets (metadata)..."\n' +
    '  SECRETS=$(aws_retry "aws secretsmanager list-secrets --region $REGION --query \\\"SecretList[].{Name:Name,ARN:ARN,LastChanged:LastChangedDate}\\\" --output text" 2>/dev/null)\n' +
    '  SEC_RC=$?\n' +
    '  if [ $SEC_RC -eq 0 ] && [ -n "$SECRETS" ] && [ "$SECRETS" != "None" ]; then\n' +
    '    echo "$SECRETS" | while IFS=$\x27\\t\x27 read -r secarn seclc secname; do\n' +
    '      if [ -n "$secname" ]; then\n' +
    '        add_inventory "Secret" "$secarn" "$secname" "$REGION" "SecretsManager" "$ACCOUNT_ID" ""\n' +
    '      fi\n' +
    '    done\n' +
    '  elif [ $SEC_RC -eq 2 ]; then\n' +
    '    log_warn "[$REGION] Permission denied for Secrets Manager"\n' +
    '    track_failure "SecretsManager" "$REGION" "Permission denied"\n' +
    '  elif [ $SEC_RC -eq 3 ]; then\n' +
    '    log_warn "[$REGION] Secrets Manager not available"\n' +
    '    track_failure "SecretsManager" "$REGION" "Service unavailable"\n' +
    '  fi\n' +
    '\n' +
    '  # --- Monitoring ---\n' +
    '\n' +
    '  # CloudWatch Alarms\n' +
    '  log_info "[$REGION] Collecting CloudWatch alarms..."\n' +
    '  CW_ALARMS=$(aws_retry "aws cloudwatch describe-alarms --region $REGION --query \\\"MetricAlarms[].{Name:AlarmName,ARN:AlarmArn,State:StateValue}\\\" --output text" 2>/dev/null)\n' +
    '  CW_RC=$?\n' +
    '  if [ $CW_RC -eq 0 ] && [ -n "$CW_ALARMS" ] && [ "$CW_ALARMS" != "None" ]; then\n' +
    '    echo "$CW_ALARMS" | while IFS=$\x27\\t\x27 read -r cwarn cwname cwstate; do\n' +
    '      if [ -n "$cwname" ]; then\n' +
    '        add_inventory "CloudWatchAlarm" "$cwarn" "$cwname" "$REGION" "CloudWatch" "$ACCOUNT_ID" "State=$cwstate"\n' +
    '      fi\n' +
    '    done\n' +
    '  elif [ $CW_RC -eq 2 ]; then\n' +
    '    log_warn "[$REGION] Permission denied for CloudWatch"\n' +
    '    track_failure "CloudWatch" "$REGION" "Permission denied"\n' +
    '  elif [ $CW_RC -eq 3 ]; then\n' +
    '    log_warn "[$REGION] CloudWatch service not available"\n' +
    '    track_failure "CloudWatch" "$REGION" "Service unavailable"\n' +
    '  fi\n' +
    '\n' +
    '  # CloudWatch Log Groups\n' +
    '  log_info "[$REGION] Collecting CloudWatch Log Groups..."\n' +
    '  CW_LOGS=$(aws_retry "aws logs describe-log-groups --region $REGION --query \\\"logGroups[].{Name:logGroupName,ARN:arn,Retention:retentionInDays}\\\" --output text" 2>/dev/null)\n' +
    '  if [ $? -eq 0 ] && [ -n "$CW_LOGS" ] && [ "$CW_LOGS" != "None" ]; then\n' +
    '    echo "$CW_LOGS" | while IFS=$\x27\\t\x27 read -r lgarn lgname lgret; do\n' +
    '      if [ -n "$lgname" ]; then\n' +
    '        add_inventory "CloudWatchLogGroup" "$lgarn" "$lgname" "$REGION" "CloudWatch" "$ACCOUNT_ID" "Retention=$lgret"\n' +
    '      fi\n' +
    '    done\n' +
    '  fi\n' +
    '\n' +
    '  # --- Region elapsed time ---\n' +
    '  REGION_END=$(date +%s)\n' +
    '  REGION_ELAPSED=$((REGION_END - REGION_START))\n' +
    '  log_ok "[$REGION] Region scan complete in ${REGION_ELAPSED}s"\n' +
    '  REGIONS_SCANNED=$((REGIONS_SCANNED + 1))\n' +
    '\n' +
    'done\n' +
    '\n' +
    '# ============================================================\n' +
    '# COMPLETION SUMMARY\n' +
    '# ============================================================\n' +
    'SCRIPT_END=$(date +%s)\n' +
    'TOTAL_ELAPSED=$((SCRIPT_END - SCRIPT_START))\n' +
    '\n' +
    'echo ""\n' +
    'echo "============================================================"\n' +
    'echo "  RMA Environment Discovery — Summary"\n' +
    'echo "============================================================"\n' +
    'echo "  Account ID:         $ACCOUNT_ID"\n' +
    'echo "  Regions scanned:    $REGIONS_SCANNED"\n' +
    'echo "  Total resources:    $TOTAL_RESOURCES"\n' +
    'echo "  Total dependencies: $TOTAL_DEPENDENCIES"\n' +
    'echo "  Total runtime:      ${TOTAL_ELAPSED}s"\n' +
    'echo "  Inventory file:     $INVENTORY_FILE"\n' +
    'echo "  Dependency file:    $DEPENDENCY_FILE"\n' +
    'echo "============================================================"\n' +
    '\n' +
    'if [ -n "$COLLECTION_FAILURES" ]; then\n' +
    '  echo ""\n' +
    '  log_warn "WARNING: Output is incomplete. The following resource types or regions could not be fully collected:"\n' +
    '  echo -e "$COLLECTION_FAILURES"\n' +
    '  echo "# COLLECTION_STATUS: INCOMPLETE — see terminal output for details" >> "$INVENTORY_FILE"\n' +
    '  echo "# COLLECTION_STATUS: INCOMPLETE — see terminal output for details" >> "$DEPENDENCY_FILE"\n' +
    'else\n' +
    '  log_ok "COLLECTION STATUS: COMPLETE"\n' +
    'fi\n' +
    '\n' +
    'log_ok "Discovery complete. Review the CSV files for your infrastructure inventory."\n' +
    '';

  function downloadDiscoveryScript() {
    var msg = 'Before downloading the Environment Discovery Script, please note:\n\n' +
      '\u2022 The script enumerates AWS resources across all enabled regions in your account (read-only).\n' +
      '\u2022 It creates CSV files containing infrastructure inventory data.\n' +
      '\u2022 Review the script source code before execution.\n' +
      '\u2022 Use read-only IAM credentials when running the script.\n' +
      '\u2022 Delete CSV files after use.\n\n' +
      'Do you want to proceed with the download?';
    if (!confirm(msg)) return;
    var blob = new Blob([DISCOVERY_SCRIPT_CONTENT], { type: 'text/x-shellscript' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'rma-environment-discovery.sh';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ============================================================
  // WIZARD_STEPS — Define each assessment step
  // ============================================================
  var WIZARD_STEPS = [
    {
      id: 'decision-layer', title: 'Are you affected by a service impairment?', stateKey: 'proceedPath',
      question: 'Are you affected by a service impairment? How would you like to proceed?',
      description: 'Choose whether you want to execute recovery yourself using guided architecture planning, or get help from an AWS partner.',
      columns: 2,
      options: [
        { value: 'self-execution', label: 'I want to execute recovery myself', description: 'Use guided architecture strategy or accelerated recovery tools to plan and execute recovery on your own.', weight: 0, icon: '🛠️' },
        { value: 'partner-assisted', label: 'I want help from AWS partners', description: 'Optional AWS partners and ISV tools can support implementation and acceleration of your recovery plan.', weight: 0, icon: '🤝' }
      ]
    },
    {
      id: 'urgency-mode', title: 'Assessment Mode', stateKey: 'urgencyMode',
      question: 'What mode should this assessment run in?',
      description: 'Architecture Strategy optimizes for best architecture. Accelerated Recovery prioritizes fastest viable recovery. Regional Partner Assistance provides access to optional MENA-region AWS partners. Partner Matchmaking recommends the best-fit partner for your situation.',
      columns: 2,
      getOptions: function (s) {
        if (s.proceedPath === 'partner-assisted') {
          return [
            { value: 'regional-partner', label: 'Regional Partner Assistance', description: 'Optional MENA-region AWS partners and ISV tools for disaster recovery or migration support.', weight: 0, icon: '🤝' },
            { value: 'matchmaking', label: 'Partner Matchmaking', description: 'Answer a short questionnaire and get a tailored partner recommendation.', weight: 0, icon: '🎯' }
          ];
        }
        return [
          { value: 'architecture-strategy', label: 'Architecture Strategy', description: 'Optimize architecture based on RTO/RPO targets and best practices.', weight: 0, icon: '🎯' },
          { value: 'immediate-dr', label: 'Accelerated Recovery', description: 'Fastest viable recovery. Prioritize speed over optimization. For active incidents or imminent threats.', weight: 30, icon: '🚨' }
        ];
      },
      options: [
        { value: 'architecture-strategy', label: 'Architecture Strategy', description: 'Optimize architecture based on RTO/RPO targets and best practices.', weight: 0, icon: '🎯' },
        { value: 'immediate-dr', label: 'Accelerated Recovery', description: 'Fastest viable recovery. Prioritize speed over optimization. For active incidents or imminent threats.', weight: 30, icon: '🚨' },
        { value: 'regional-partner', label: 'Regional Partner Assistance', description: 'Optional MENA-region AWS partners and ISV tools for disaster recovery or migration support.', weight: 0, icon: '🤝' },
        { value: 'matchmaking', label: 'Partner Matchmaking', description: 'Answer a short questionnaire and get a tailored partner recommendation.', weight: 0, icon: '🎯' }
      ]
    },
    {
      id: 'dr-strategy', title: 'Disaster Recovery Strategy', stateKey: 'drStrategy',
      question: 'What is your current disaster recovery strategy?',
      description: 'Your DR strategy determines the recovery approach and timeline. This helps tailor recovery recommendations.',
      columns: 3,
      conditional: function (s) { return true; },
      optional: true,
      options: [
        { value: 'active-active', label: 'Active-active multi-region', description: 'Traffic served from multiple regions simultaneously.', weight: 0, icon: '🌐' },
        { value: 'pilot-light', label: 'Pilot light', description: 'Minimal resources running in DR region, scaled up on failover.', weight: 5, icon: '🔥' },
        { value: 'warm-standby', label: 'Warm standby', description: 'Scaled-down but functional copy running in DR region.', weight: 3, icon: '♨️' },
        { value: 'backup-restore', label: 'Backup and restore', description: 'Regular backups, restore to DR region when needed.', weight: 10, icon: '💾' },
        { value: 'none', label: 'No DR strategy', description: 'No disaster recovery plan in place.', weight: 20, icon: '⚠️' },
        { value: 'unknown', label: 'Unknown', description: 'Not sure about current DR posture.', weight: 15, icon: '❓' }
      ]
    },
    {
      id: 'backup-location', title: 'Backup Location', stateKey: 'backupLocation',
      question: 'Where are your backups stored?',
      description: 'Backup location affects recovery speed and resilience during regional failures.',
      columns: 3,
      conditional: function (s) { return true; },
      optional: true,
      options: [
        { value: 'same-region', label: 'Same region', description: 'Backups stored in the same region as production.', weight: 15, icon: '📍' },
        { value: 'cross-region', label: 'Cross-region', description: 'Backups replicated to another AWS region.', weight: 0, icon: '🌍' },
        { value: 'cross-account', label: 'Cross-account', description: 'Backups stored in a separate AWS account.', weight: 0, icon: '🔐' },
        { value: 'external', label: 'External backup provider', description: 'Third-party backup solution outside AWS.', weight: 5, icon: '☁️' },
        { value: 'unknown', label: 'Unknown', description: 'Not sure where backups are stored.', weight: 10, icon: '❓' }
      ]
    },
    {
      id: 'backup-technology', title: 'Backup Technology', stateKey: 'backupTechnology',
      question: 'What backup solution are you using?',
      description: 'This determines which restore commands appear in your recovery plan.',
      columns: 3,
      conditional: function (s) { return true; },
      optional: true,
      options: [
        { value: 'aws-backup', label: 'AWS Backup', description: 'Centralized backup service with cross-region and cross-account support.', weight: 0, icon: '🛡️' },
        { value: 'native-snapshots', label: 'Native service snapshots', description: 'EBS snapshots, RDS snapshots, DynamoDB backups.', weight: 5, icon: '📸' },
        { value: 'third-party', label: 'Third-party backup solution', description: 'N2W, Veeam, Commvault, or similar.', weight: 5, icon: '🔧' },
        { value: 'custom-scripts', label: 'Custom scripts', description: 'Custom backup scripts or automation.', weight: 10, icon: '📜' },
        { value: 'unknown', label: 'Unknown', description: 'Not sure about backup technology.', weight: 10, icon: '❓' }
      ]
    },
    {
      id: 'panic-partner', title: 'DR Acceleration Partner', stateKey: 'panicPartner',
      question: 'Select your DR acceleration partner tool',
      description: 'Each partner offers a different approach to rapid disaster recovery. Select one to get tailored accelerated execution steps.',
      columns: 3,
      conditional: function (s) { return s.proceedPath === 'self-execution' && s.urgencyMode === 'immediate-dr'; },
      options: [
        {
          value: 'controlmonkey', label: 'ControlMonkey', weight: 0, icon: '🐒',
          description: 'IaC-first DR. Terraform-based snapshots of entire infra (networks, IAM, DNS). Restore to known-good state.'
        },
        {
          value: 'n2ws', label: 'N2W Backup & Recovery', weight: 0, icon: '🛡️',
          description: 'Cloud-native backup & automated DR. Snapshot-based recovery for EC2, RDS, EBS, DynamoDB, S3, EFS.'
        },
        {
          value: 'firefly', label: 'Firefly', weight: 0, icon: '🔥',
          description: 'Cloud Asset Management + IaC automation. Auto-codify infra, detect drift, rebuild apps via IaC pipelines.'
        }
      ],
      partnerDetails: {
        controlmonkey: {
          fullName: 'ControlMonkey Platform',
          marketplace: 'https://aws.amazon.com/marketplace/pp/prodview-3cuadcjyrgj4q',
          website: 'https://controlmonkey.io',
          focus: 'Infrastructure configuration DR (networks, IAM, DNS, security policies)',
          approach: 'Terraform-based infrastructure snapshots and automated restoration',
          pros: [
            'Automatic Terraform-based snapshots of entire cloud infrastructure',
            'Restores networks, IAM, DNS, security policies — not just data',
            'According to ControlMonkey, may significantly reduce recovery time for infrastructure config (results vary by environment)',
            'Drift detection and remediation prevents config divergence',
            'Available on AWS Marketplace for consolidated billing',
            'Covers third-party SaaS configurations alongside AWS'
          ],
          cons: [
            'Focused on infrastructure config — does not back up application data (databases, S3 objects)',
            'Requires Terraform/OpenTofu adoption or willingness to adopt',
            'Newer DR-specific capability — verify current feature set on ControlMonkey website',
            'Must be paired with a data backup solution (AWS Backup, N2W) for complete DR'
          ],
          immediateSteps: [
            { step: 'Subscribe via AWS Marketplace', detail: 'Go to the ControlMonkey AWS Marketplace listing and subscribe. Billing is consolidated through your AWS account. SaaS platform — no EC2 instance to deploy.', cmd: '# AWS Marketplace listing:\n# https://aws.amazon.com/marketplace/pp/prodview-3cuadcjyrgj4q\n\n# Click "Continue to Subscribe" > Complete subscription\n# ControlMonkey is SaaS — no infrastructure to deploy in your account' },
            { step: 'Connect AWS account(s)', detail: 'Create a read-only IAM role and provide it to ControlMonkey during onboarding. ControlMonkey scans your infrastructure and begins taking automatic daily Terraform-based snapshots.', cmd: '# Create IAM role for ControlMonkey\naws iam create-role --role-name ControlMonkeyRole \\\n  --assume-role-policy-document file://cm-trust-policy.json\naws iam attach-role-policy --role-name ControlMonkeyRole \\\n  --policy-arn arn:aws:iam::aws:policy/ReadOnlyAccess\n\n# Provide role ARN in ControlMonkey onboarding wizard\n# ControlMonkey begins scanning: VPCs, subnets, SGs, IAM,\n# Route 53, ALB/NLB, ASGs, and third-party configs' },
            { step: 'Review infrastructure snapshot', detail: 'ControlMonkey generates a Terraform-based snapshot of your entire infrastructure. Review the Cloud Resilience Dashboard for DR readiness — see what is covered by IaC vs what is not.', cmd: '# From ControlMonkey dashboard:\n# 1. Go to Cloud Resilience Dashboard\n# 2. Review: IaC coverage %, unmanaged resources\n# 3. Check daily snapshot history ("Time Machine")\n# 4. Identify gaps: resources not yet captured in IaC' },
            { step: 'Use Time Machine to select restore point', detail: 'ControlMonkey Time Machine lets you browse infrastructure state at any previous point in time. Select the last known-good state before the incident.', cmd: '# From ControlMonkey dashboard:\n# 1. Go to Time Machine\n# 2. Select date/time of last known-good state\n# 3. Review infrastructure configuration at that point\n# 4. Compare with current state to identify drift/damage\n# 5. Select "Restore" to generate Terraform for that state' },
            { step: 'Deploy to target region', detail: 'Use the Terraform code from the selected restore point to deploy infrastructure in the target region. ControlMonkey generates region-aware Terraform that you can apply directly.', cmd: '# Download Terraform from ControlMonkey restore point\n# Modify provider block for target region:\n#   provider "aws" { region = "<TARGET_REGION>" }\n\nterraform init\nterraform plan\nterraform apply\n\n# This recreates: VPCs, subnets, security groups, IAM roles,\n# Route 53 records, load balancers, auto scaling configs' },
            { step: 'Enable continuous drift monitoring', detail: 'Enable ControlMonkey drift detection for the target region to prevent configuration divergence during the crisis. Get alerts on any unauthorized changes.', cmd: '# From ControlMonkey dashboard:\n# 1. Settings > Drift Detection > Enable for target region\n# 2. Set notification channels (Slack, email, webhook)\n# 3. Configure auto-remediation for critical resources\n# 4. Monitor Cloud Resilience Dashboard for ongoing status' }
          ]
        },
        n2ws: {
          fullName: 'N2W Backup & Recovery',
          marketplace: 'https://aws.amazon.com/marketplace/pp/B00UIO8898',
          marketplaceNote: 'Marketplace listing may still show legacy name "N2WS". Multiple editions available including Free Trial/BYOL.',
          website: 'https://n2ws.com',
          focus: 'Data backup and automated disaster recovery for AWS resources',
          approach: 'Native AWS snapshot technology with automated cross-region DR orchestration',
          pros: [
            'Automated disaster recovery — orchestrates environment restoration from snapshots with minimal clicks (recovery time depends on environment size and complexity)',
            'Covers EC2, EBS, RDS, Aurora, Redshift, DynamoDB, S3, EFS, FSx',
            'Application-consistent backups for databases',
            'Cross-region and cross-account DR built-in',
            'Mature product — long track record on AWS Marketplace',
            'Free trial available — 30-day evaluation period',
            'Single dashboard for all backup and DR operations'
          ],
          cons: [
            'Focused on data/resource backup — does not capture IaC or infrastructure-as-code state',
            'Requires N2W instance deployed in your AWS account (EC2-based)',
            'Per-resource pricing can add up for large environments',
            'Does not generate Terraform/CloudFormation — recovery is snapshot-based',
            'Manual IaC capture still needed for networking, IAM, DNS configs'
          ],
          immediateSteps: [
            { step: 'Deploy N2W from AWS Marketplace', detail: 'Subscribe on AWS Marketplace and launch N2W as an AMI in your target region. You can also deploy via CloudFormation template for automated IAM role setup. Free trial available for evaluation.', cmd: '# Option 1: Launch via Marketplace\n# Visit: https://aws.amazon.com/marketplace/pp/B00UIO8898\n# Select "Continue to Subscribe" > "Continue to Configuration"\n# Choose AMI fulfillment, select <TARGET_REGION>, launch via EC2\n\n# Option 2: Deploy via CloudFormation (auto-creates IAM roles)\n# See N2W docs: https://docs.n2ws.com/quick-start/6.-configure-n2ws-with-cloudformation\n\n# Free Trial:\n# https://aws.amazon.com/marketplace/pp/prodview-rbrdccv7wu5um' },
            { step: 'Configure accounts and regions', detail: 'Once N2W is running, add your AWS accounts and configure cross-region settings. If deployed via CloudFormation, IAM roles are auto-created with required permissions.', cmd: '# From N2W dashboard (https://<N2W_IP>:443):\n# 1. Complete initial setup wizard\n# 2. Add AWS account(s) — enter account ID\n# 3. If manual setup: create IAM role with N2W policy\n# 4. Enable cross-region: Settings > DR > Add target region\n# 5. Verify connectivity to both source and target regions' },
            { step: 'Create backup policies for critical resources', detail: 'Define backup policies targeting your most critical resources. N2W supports configurable backup intervals (verify current minimum interval in N2W documentation). Enable cross-region copy to target region. Capture VPC settings for full environment restore.', cmd: '# From N2W dashboard:\n# 1. Policies > Create New Policy\n# 2. Select resources: EC2, EBS, RDS, Aurora, DynamoDB, S3, EFS\n# 3. Enable "Cross-Region DR Copy" to <TARGET_REGION>\n# 4. Enable "Backup VPC Configuration" for network restore\n# 5. Set schedule: "Immediate" for accelerated recovery\n# 6. Set retention: minimum needed for DR' },
            { step: 'Execute immediate backup', detail: 'Trigger an immediate backup run. N2W uses native AWS snapshot technology for application-consistent backups. Monitor progress in the dashboard.', cmd: '# From N2W dashboard:\n# 1. Policies > Select policy > "Run Now"\n# 2. Monitor: Dashboard > Backup Monitor\n# 3. Verify snapshots appear in target region:\n# Note: date -d syntax is Linux-specific. On macOS, use: date -u -v-1H\naws ec2 describe-snapshots --owner-ids <ACCOUNT_ID> --region <TARGET_REGION> --query "Snapshots[?StartTime>=\`$(date -u -d \'1 hour ago\' +%Y-%m-%dT%H:%M:%S)\`]"' },
            { step: 'Automated DR to target region', detail: 'Use N2W DR recovery to restore the full environment in the target region. N2W orchestrates multi-resource failover in the correct order (VPC first, then data, then compute).', cmd: '# From N2W dashboard:\n# 1. DR > Recovery Scenarios\n# 2. Select target region: <TARGET_REGION>\n# 3. Select resources to recover (or "Recover All")\n# 4. Click "Recover" — N2W launches instances,\n#    restores databases, attaches volumes, configures VPC\n# 5. Monitor recovery progress in DR dashboard' },
            { step: 'Validate recovered environment', detail: 'Verify all resources are running in the target region. N2W provides DR drill reports for validation. Check application health and data integrity.', cmd: '# Verify EC2 instances running\naws ec2 describe-instances --filters "Name=instance-state-name,Values=running" --region <TARGET_REGION>\n\n# Verify RDS available\naws rds describe-db-instances --region <TARGET_REGION>\n\n# Application health check\ncurl -s -o /dev/null -w "%{http_code}" https://<HOSTNAME>/health\n\n# N2W DR drill report available in dashboard:\n# DR > Reports > Latest Recovery Report' }
          ]
        },
        firefly: {
          fullName: 'Firefly — Cloud Asset Management',
          marketplace: 'https://aws.amazon.com/marketplace/pp/prodview-k5facxsdsy4he',
          website: 'https://www.firefly.ai',
          focus: 'Cloud asset management, IaC codification, drift detection, and automated recovery',
          approach: 'Auto-codify existing infrastructure into IaC, detect drift, rebuild applications using IaC pipelines',
          pros: [
            'Automatically codifies existing cloud resources into Terraform/Pulumi IaC',
            'Asset history enables rollback to any previous configuration state',
            'Real-time drift detection with automated remediation via pull requests',
            'Cross-cloud support (AWS, Azure, GCP) for multi-cloud environments',
            'AI-driven policy engine for compliance enforcement',
            'Application-level backup and DR with IaC-first approach',
            'Available on AWS Marketplace'
          ],
          cons: [
            'IaC-first approach — requires understanding of Terraform/Pulumi workflows',
            'Does not perform native AWS snapshot-based backup (not a replacement for AWS Backup)',
            'Recovery speed depends on IaC pipeline execution time',
            'Newer entrant compared to established backup tools',
            'Data-layer recovery still requires native AWS replication or backup tools'
          ],
          immediateSteps: [
            { step: 'Sign up via AWS Marketplace', detail: 'Subscribe to Firefly on AWS Marketplace for consolidated billing. Alternatively, sign up directly at firefly.ai for immediate access.', cmd: '# AWS Marketplace:\n# https://aws.amazon.com/marketplace/pp/prodview-k5facxsdsy4he\n\n# Direct signup:\n# https://www.firefly.ai/get-firefly' },
            { step: 'Connect AWS account and scan inventory', detail: 'Provide read-only access via IAM role. Firefly auto-discovers all cloud resources across all regions and builds a complete asset inventory showing IaC coverage status (managed vs unmanaged).', cmd: '# Create IAM role for Firefly (read-only)\naws iam create-role --role-name FireflyReadOnly \\\n  --assume-role-policy-document file://firefly-trust.json\naws iam attach-role-policy --role-name FireflyReadOnly \\\n  --policy-arn arn:aws:iam::aws:policy/ReadOnlyAccess\n\n# Firefly auto-discovers all resources across regions\n# Dashboard shows: Managed vs Unmanaged, Drift status, Ghost resources' },
            { step: 'Create Application Backup Policy', detail: 'Use Firefly Applications Backup & DR feature. Define application-level backup policies using tags. Firefly captures all resource relationships and dependencies automatically. Choose schedule: On-Demand for immediate, or Daily/Weekly for ongoing.', cmd: '# From Firefly dashboard:\n# 1. Go to Applications Backup & DR > Policies\n# 2. Create New Policy:\n#    - Name: "immediate-dr-critical-apps"\n#    - Data Source: AWS\n#    - Tags: e.g. Environment=Production, Criticality=High\n#    - Schedule: On-Demand (for immediate snapshot)\n# 3. Firefly auto-captures all dependencies\n#    (VPC, subnets, SGs, IAM roles, etc.)' },
            { step: 'Auto-codify unmanaged infrastructure', detail: 'For resources not yet in IaC, use Firefly Codification to generate Terraform/Pulumi/CloudFormation code automatically. This creates the blueprint needed for cross-region deployment.', cmd: '# From Firefly dashboard:\n# 1. Go to Inventory > filter "Unmanaged"\n# 2. Select critical unmanaged resources\n# 3. Click "Codify" > Choose format (Terraform)\n# 4. Firefly generates .tf files with all configs\n# 5. Download or push directly to Git repository\n# Supports: Terraform, Pulumi, CloudFormation' },
            { step: 'Restore to target region via Terraform', detail: 'Restore from application snapshot by generating Terraform code. Firefly produces ready-to-apply IaC that recreates the full application stack. Modify region-specific parameters and apply.', cmd: '# From Firefly dashboard:\n# 1. Applications Backup & DR > Snapshots\n# 2. Select snapshot > Select resources to restore\n# 3. Preview generated Terraform code\n# 4. Download Terraform files\n\n# Apply to target region:\nterraform init\nterraform plan -var="region=<TARGET_REGION>"\nterraform apply\n\n# Note: Update region-specific refs (AMI IDs, subnet IDs)' },
            { step: 'Enable drift monitoring and alerts', detail: 'Set up real-time drift detection for the recovered environment. Firefly monitors for configuration changes and can auto-remediate via pull requests to maintain consistency during the crisis.', cmd: '# From Firefly dashboard:\n# 1. Governance > Drift Detection > Enable for target region\n# 2. Configure alert channels:\n#    - Slack, email, PagerDuty, OpsGenie\n# 3. Enable auto-remediation:\n#    - Firefly creates PRs for drift fixes\n#    - Review and merge to restore desired state\n# 4. Monitor: Dashboard > Drift tab' }
          ]
        }
      }
    },
    {
      id: 'regional-partner-select', title: 'Select Regional Partner', stateKey: 'regionalPartner',
      question: 'Select a MENA-region AWS partner to engage',
      description: 'These are MENA-region AWS partners with experience in resilience and migration workloads. Choose a partner for disaster recovery or migration assistance. Compare capabilities below.',
      conditional: function (s) { return s.proceedPath === 'partner-assisted' && s.urgencyMode === 'regional-partner'; },
      columns: 3,
      compact: true,
      options: [
        { value: 'bestcloudfor_me', label: REGIONAL_PARTNERS.bestcloudfor_me.fullName, description: REGIONAL_PARTNERS.bestcloudfor_me.focus, weight: 0, icon: '☁️' },
        { value: 'integra', label: REGIONAL_PARTNERS.integra.fullName, description: REGIONAL_PARTNERS.integra.focus, weight: 0, icon: '🔧' },
        { value: 'sudo', label: REGIONAL_PARTNERS.sudo.fullName, description: REGIONAL_PARTNERS.sudo.focus, weight: 0, icon: '💻' },
        { value: 'zaintech', label: REGIONAL_PARTNERS.zaintech.fullName, description: REGIONAL_PARTNERS.zaintech.focus, weight: 0, icon: '🌐' },
        { value: 'bexprt', label: REGIONAL_PARTNERS.bexprt.fullName, description: REGIONAL_PARTNERS.bexprt.focus, weight: 0, icon: '⚡' },
        { value: 'ibm', label: REGIONAL_PARTNERS.ibm.fullName, description: REGIONAL_PARTNERS.ibm.focus, weight: 0, icon: '🏢' },
        { value: 'accenture', label: REGIONAL_PARTNERS.accenture.fullName, description: REGIONAL_PARTNERS.accenture.focus, weight: 0, icon: '🔷' },
        { value: 'deloitte', label: REGIONAL_PARTNERS.deloitte.fullName, description: REGIONAL_PARTNERS.deloitte.focus, weight: 0, icon: '📊' },
        { value: 'publicis_sapient', label: REGIONAL_PARTNERS.publicis_sapient.fullName, description: REGIONAL_PARTNERS.publicis_sapient.focus, weight: 0, icon: '🎨' },
        { value: 'tcs', label: REGIONAL_PARTNERS.tcs.fullName, description: REGIONAL_PARTNERS.tcs.focus, weight: 0, icon: '🏗️' },
        { value: 'hcl', label: REGIONAL_PARTNERS.hcl.fullName, description: REGIONAL_PARTNERS.hcl.focus, weight: 0, icon: '⚙️' },
        { value: 'noventiq', label: REGIONAL_PARTNERS.noventiq.fullName, description: REGIONAL_PARTNERS.noventiq.focus, weight: 0, icon: '🔒' },
        { value: 'dxc', label: REGIONAL_PARTNERS.dxc.fullName, description: REGIONAL_PARTNERS.dxc.focus, weight: 0, icon: '🖧' },
        { value: 'limoncloud', label: REGIONAL_PARTNERS.limoncloud.fullName, description: REGIONAL_PARTNERS.limoncloud.focus, weight: 0, icon: '🍋' },
        { value: 'redington', label: REGIONAL_PARTNERS.redington.fullName, description: REGIONAL_PARTNERS.redington.focus, weight: 0, icon: '🔐' },
        { value: 'controlmonkey', label: 'ControlMonkey', description: 'IaC-first DR. Terraform-based snapshots and automated restoration.', weight: 0, icon: '🐒' },
        { value: 'n2ws', label: 'N2W Backup & Recovery', description: 'Cloud-native backup and automated disaster recovery.', weight: 0, icon: '🛡️' },
        { value: 'firefly', label: 'Firefly', description: 'Cloud asset management, IaC codification, and automated recovery.', weight: 0, icon: '🔥' }
      ]
    },
    {
      id: 'mm-workload-type', title: 'Workload Type', stateKey: 'mmWorkload',
      question: 'What type of workload needs recovery or migration?',
      description: 'This helps match you with a partner experienced in your workload architecture.',
      conditional: function (s) { return s.proceedPath === 'partner-assisted' && s.urgencyMode === 'matchmaking'; },
      columns: 4,
      options: [
        { value: 'ec2', label: 'EC2 / VM-based', description: 'Traditional EC2 instances and Auto Scaling Groups.', weight: 0, icon: '🖥️' },
        { value: 'containers', label: 'Containers', description: 'ECS, EKS, or Fargate containerized workloads.', weight: 0, icon: '🐳' },
        { value: 'serverless', label: 'Serverless', description: 'Lambda, API Gateway, Step Functions.', weight: 0, icon: '⚡' },
        { value: 'mixed', label: 'Mixed', description: 'Combination of EC2, containers, and serverless.', weight: 0, icon: '🔀' }
      ]
    },
    {
      id: 'mm-data-profile', title: 'Data Profile', stateKey: 'mmData',
      question: 'What is your data footprint?',
      description: 'Data volume and statefulness determine backup and replication strategy.',
      conditional: function (s) { return s.proceedPath === 'partner-assisted' && s.urgencyMode === 'matchmaking'; },
      columns: 3,
      options: [
        { value: 'insignificant', label: 'Insignificant', description: 'Stateless or minimal data. Easy to rebuild.', weight: 0, icon: '🪶' },
        { value: 'stateful', label: 'Stateful', description: 'Moderate data with state. Requires replication.', weight: 0, icon: '💾' },
        { value: 'heavy-db', label: 'Heavy databases', description: 'Large RDS, DynamoDB, or data warehouse workloads.', weight: 0, icon: '🗄️' }
      ]
    },
    {
      id: 'mm-urgency', title: 'Urgency', stateKey: 'mmUrgency',
      question: 'How urgent is your recovery or migration?',
      description: 'Urgency determines whether you need accelerated recovery tools or planned migration.',
      conditional: function (s) { return s.proceedPath === 'partner-assisted' && s.urgencyMode === 'matchmaking'; },
      columns: 3,
      options: [
        { value: 'immediate', label: 'Accelerated Recovery', description: 'Active incident. Need recovery now.', weight: 0, icon: '🚨' },
        { value: 'days', label: 'Days', description: 'Near-term. Need a plan within days.', weight: 0, icon: '📅' },
        { value: 'weeks', label: 'Weeks', description: 'Planned migration or DR setup over weeks.', weight: 0, icon: '🗓️' }
      ]
    },
    {
      id: 'mm-env-complexity', title: 'Environment Complexity', stateKey: 'mmComplexity',
      question: 'How complex is your environment?',
      description: 'Complexity affects partner selection — some specialize in multi-account or hybrid setups.',
      conditional: function (s) { return s.proceedPath === 'partner-assisted' && s.urgencyMode === 'matchmaking'; },
      columns: 4,
      options: [
        { value: 'single-vpc', label: 'Single VPC', description: 'One VPC, straightforward networking.', weight: 0, icon: '🔲' },
        { value: 'multi-vpc', label: 'Multi VPC', description: 'Multiple VPCs, possibly multi-account.', weight: 0, icon: '🔳' },
        { value: 'hybrid', label: 'Hybrid', description: 'On-premises + AWS hybrid architecture.', weight: 0, icon: '🔄' },
        { value: 'multi-region', label: 'Multi-region', description: 'Workloads spanning multiple AWS regions.', weight: 0, icon: '🌍' }
      ]
    },
    {
      id: 'mm-recovery-approach', title: 'Recovery Approach', stateKey: 'mmApproach',
      question: 'What is your preferred recovery approach?',
      description: 'This determines the type of partner tooling and methodology recommended.',
      conditional: function (s) { return s.proceedPath === 'partner-assisted' && s.urgencyMode === 'matchmaking'; },
      columns: 4,
      options: [
        { value: 'fastest', label: 'Fastest recovery', description: 'Minimize downtime at any cost.', weight: 0, icon: '⚡' },
        { value: 'iac-rebuild', label: 'IaC rebuild', description: 'Rebuild infrastructure using Terraform/CloudFormation.', weight: 0, icon: '🏗️' },
        { value: 'backup-restore', label: 'Backup restore', description: 'Restore from snapshots and backups.', weight: 0, icon: '💾' },
        { value: 'partner-led', label: 'Partner-led migration', description: 'Full partner engagement for migration.', weight: 0, icon: '🤝' }
      ]
    },
    {
      id: 'mm-industry', title: 'Industry', stateKey: 'mmIndustry',
      question: 'What industry are you in?',
      description: 'Some partners specialize in specific industries. This step is optional — skip if not applicable.',
      conditional: function (s) { return s.proceedPath === 'partner-assisted' && s.urgencyMode === 'matchmaking'; },
      optional: true,
      columns: 3,
      options: [
        { value: 'finance', label: 'Finance', description: 'Banking, insurance, fintech.', weight: 0, icon: '🏦' },
        { value: 'telco', label: 'Telco', description: 'Telecommunications and media.', weight: 0, icon: '📡' },
        { value: 'public-sector', label: 'Public sector', description: 'Government and public services.', weight: 0, icon: '🏛️' },
        { value: 'enterprise', label: 'Enterprise', description: 'Large enterprise and conglomerates.', weight: 0, icon: '🏢' },
        { value: 'other', label: 'Other', description: 'Other industries or not applicable.', weight: 0, icon: '📋' }
      ]
    },
    {
      id: 'region-data-discovery', title: 'Region Data Discovery', stateKey: 'regionDiscovery',
      question: 'Discover your current region inventory',
      description: 'Run these AWS CLI commands to inventory your resources before making architecture decisions. This step is informational — review the commands and proceed.',
      conditional: function (s) { return s.proceedPath === 'self-execution' && s.urgencyMode === 'architecture-strategy'; },
      informational: true,
      columns: 1,
      // FIX #1: Discovery commands rendered as code blocks, NOT inside card text
      discoveryCommands: [
        { title: 'EC2 Instances', cmd: 'aws ec2 describe-instances --query "Reservations[].Instances[].{ID:InstanceId,Type:InstanceType,State:State.Name,AZ:Placement.AvailabilityZone}" --output table' },
        { title: 'RDS Databases', cmd: 'aws rds describe-db-instances --query "DBInstances[].{ID:DBInstanceIdentifier,Engine:Engine,Status:DBInstanceStatus,AZ:AvailabilityZone}" --output table' },
        { title: 'VPC Networking', cmd: 'aws ec2 describe-vpcs --query "Vpcs[].{ID:VpcId,CIDR:CidrBlock,State:State}" --output table' },
        { title: 'IAM Summary', cmd: 'aws iam get-account-summary --output table' },
        { title: 'Route 53 DNS', cmd: 'aws route53 list-hosted-zones --output table' },
        { title: 'S3 Buckets', cmd: 'aws s3 ls' }
      ],
      options: [
        { value: 'acknowledged', label: 'I have reviewed the discovery commands', description: 'Click to acknowledge you have reviewed the discovery commands above.', weight: 0, icon: '✅' }
      ]
    },
    {
      id: 'data-handling', title: 'Data Handling Strategy', stateKey: 'dataHandling',
      question: 'How should data be handled during migration?',
      description: 'Covers S3, DocumentDB, relational databases, and object storage.',
      conditional: function (s) { return s.proceedPath === 'self-execution' && s.urgencyMode === 'architecture-strategy'; },
      columns: 3,
      options: [
        { value: 'move', label: 'Move Data', description: 'One-time data migration to target region. Source data removed after validation.', weight: 10, icon: '📦' },
        { value: 'replicate', label: 'Replicate Data', description: 'Continuous cross-region replication. Data exists in both regions.', weight: 15, icon: '🔄' },
        { value: 'backup-restore', label: 'Backup & Restore', description: 'Periodic backups with restore-on-demand in target region.', weight: 5, icon: '💾' }
      ]
    },
    {
      id: 'workload-criticality', title: 'Workload Criticality', stateKey: 'workloadCriticality',
      question: 'How critical is this workload?',
      description: 'This determines your recovery architecture and investment level.',
      conditional: function (s) { return s.proceedPath === 'self-execution' && s.urgencyMode === 'architecture-strategy'; },
      columns: 3,
      options: [
        { value: 'tier-0', label: 'Tier 0 — Mission Critical', description: 'Zero downtime tolerance. Revenue-generating, customer-facing.', weight: 30, icon: '🔴' },
        { value: 'tier-1', label: 'Tier 1 — Business Critical', description: 'Important but tolerates brief outages. Internal tools, batch jobs.', weight: 20, icon: '🟠' },
        { value: 'tier-2', label: 'Tier 2 — Non-Critical', description: 'Dev, staging, or archival workloads.', weight: 5, icon: '🟢' }
      ]
    },
    {
      id: 'app-type', title: 'Application Type', stateKey: 'appType',
      question: 'What is the primary application architecture?',
      description: 'This determines deployment approach, validation steps, and tooling recommendations.',
      conditional: function (s) { return s.proceedPath === 'self-execution' && s.urgencyMode === 'architecture-strategy'; },
      columns: 4,
      options: [
        { value: 'ec2', label: 'EC2 / VM-based', description: 'Traditional EC2 instances, Auto Scaling Groups, AMI-based deployments.', weight: 10, icon: '🖥️' },
        { value: 'containers', label: 'Containers (ECS/EKS)', description: 'Containerized workloads on ECS Fargate, ECS EC2, or EKS.', weight: 5, icon: '🐳' },
        { value: 'serverless', label: 'Serverless (Lambda)', description: 'Lambda functions, API Gateway, Step Functions, EventBridge.', weight: 0, icon: '⚡' },
        { value: 'mixed', label: 'Mixed / Multi-tier', description: 'Combination of EC2, containers, and/or serverless components.', weight: 15, icon: '🔀' }
      ]
    },
    {
      id: 'landing-zone', title: 'Landing Zone / Governance', stateKey: 'landingZone',
      question: 'What is your foundation / landing zone posture?',
      description: 'Governance model affects account vending, guardrails, and baseline readiness in the target region.',
      conditional: function (s) { return s.proceedPath === 'self-execution' && s.urgencyMode === 'architecture-strategy'; },
      columns: 3,
      options: [
        { value: 'control-tower', label: 'AWS Control Tower / LZA', description: 'Managed landing zone with guardrails, OUs, and centralized logging.', weight: 0, icon: '🏗️' },
        { value: 'custom-lz', label: 'Custom Landing Zone', description: 'AWS Organizations + SCPs + custom automation. No Control Tower.', weight: 10, icon: '⚙️' },
        { value: 'single-account', label: 'Single Account / Minimal', description: 'Single account or minimal governance. No Organizations.', weight: 20, icon: '📋' }
      ]
    },
    {
      id: 'recovery-rto', title: 'Recovery Time Objective', stateKey: 'recoveryRequirements',
      question: 'What is your Recovery Time Objective (RTO)?',
      description: 'Maximum acceptable time to restore service after a disruption.',
      conditional: function (s) { return s.proceedPath === 'self-execution' && s.urgencyMode === 'architecture-strategy'; },
      columns: 4,
      options: [
        { value: 'rto-lt-1h', label: 'RTO < 1 hour', description: 'Near-zero downtime. Active-active or hot standby.', weight: 30, icon: '⚡' },
        { value: 'rto-1-4h', label: 'RTO 1–4 hours', description: 'Warm standby with automated failover.', weight: 20, icon: '🕐' },
        { value: 'rto-4-24h', label: 'RTO 4–24 hours', description: 'Pilot light with manual scale-up.', weight: 10, icon: '🕓' },
        { value: 'rto-gt-24h', label: 'RTO > 24 hours', description: 'Backup and restore from snapshots.', weight: 5, icon: '📦' }
      ]
    },
    {
      id: 'recovery-rpo', title: 'Recovery Point Objective', stateKey: 'rpo',
      question: 'What is your Recovery Point Objective (RPO)?',
      description: 'Maximum acceptable data loss measured in time. Drives replication strategy.',
      conditional: function (s) { return s.proceedPath === 'self-execution' && s.urgencyMode === 'architecture-strategy'; },
      columns: 4,
      options: [
        { value: 'near-zero', label: 'Near-zero', description: 'Synchronous replication. No data loss acceptable.', weight: 30, icon: '🔒' },
        { value: 'lt-15m', label: 'RPO < 15 min', description: 'Async replication with tight lag monitoring.', weight: 20, icon: '⏱️' },
        { value: 'lt-1h', label: 'RPO < 1 hour', description: 'Frequent snapshots or async replication.', weight: 10, icon: '🕐' },
        { value: 'lt-24h', label: 'RPO < 24 hours', description: 'Daily backups acceptable.', weight: 5, icon: '📅' }
      ]
    },
    {
      id: 'data-profile', title: 'Data Profile', stateKey: 'dataProfile',
      question: 'What does your data footprint look like?',
      description: 'Determines whether data replication steps are needed.',
      conditional: function (s) { return s.proceedPath === 'self-execution' && s.urgencyMode === 'architecture-strategy'; },
      columns: 3,
      options: [
        { value: 'stateful-large', label: 'Stateful — Large (>100 GB)', description: 'Databases, large S3 buckets, persistent EBS volumes.', weight: 25, icon: '🗄️' },
        { value: 'stateful-small', label: 'Stateful — Small (<100 GB)', description: 'Small databases, config stores, modest S3 data.', weight: 15, icon: '💾' },
        { value: 'stateless', label: 'Insignificant Data Footprint', description: 'No meaningful persistent state. Re-deploy is primary strategy.', weight: 5, icon: '☁️' }
      ]
    },
    {
      id: 'source-s3-availability', title: 'Source Region S3 Status', stateKey: 'sourceS3Availability',
      question: 'Is Amazon S3 currently available in the source region?',
      description: 'S3 availability affects which database migration methods are viable. Snapshot copy, cross-region automated backups, and S3-based export/import all depend on S3 in the source region. Check the AWS Health Dashboard if unsure.',
      conditional: function (s) { return s.proceedPath === 'self-execution' && s.urgencyMode === 'architecture-strategy' && s.dataProfile && s.dataProfile.startsWith('stateful'); },
      columns: 3,
      options: [
        { value: 'available', label: 'S3 Available', description: 'S3 is operating normally in the source region.', weight: 0, icon: '✅' },
        { value: 'impaired', label: 'S3 Impaired / Unavailable', description: 'S3 is degraded or unavailable. Snapshot-based methods may not work.', weight: 10, icon: '🔴' },
        { value: 'unknown', label: 'Unknown / Not Sure', description: 'Verify via AWS Health Dashboard before proceeding.', weight: 5, icon: '❓' }
      ]
    },
    {
      id: 'database-types', title: 'Database Types', stateKey: 'dbTypes',
      question: 'Which database / data store types are in scope?',
      description: 'Select ALL that apply. Each generates specific replication commands and validation steps.',
      columns: 3,
      multiSelect: true,
      conditional: function (s) { return s.proceedPath === 'self-execution' && s.urgencyMode === 'architecture-strategy' && s.dataProfile && s.dataProfile.startsWith('stateful'); },
      options: [
        { value: 'aurora', label: 'Aurora (MySQL/PostgreSQL)', description: 'Aurora Global Database with typically sub-second replication lag.', weight: 5, icon: '🐬' },
        { value: 'rds', label: 'RDS (MySQL/PG/MariaDB)', description: 'Standard RDS. Cross-region read replicas.', weight: 10, icon: '🗃️' },
        { value: 'dynamodb', label: 'DynamoDB', description: 'NoSQL. Global Tables for multi-active replication.', weight: 5, icon: '⚡' },
        { value: 'documentdb', label: 'DocumentDB', description: 'Document DB. Global Clusters for cross-region.', weight: 10, icon: '📄' },
        { value: 'elasticache', label: 'ElastiCache (Redis)', description: 'In-memory cache. Global Datastore for cross-region.', weight: 5, icon: '🔥' },
        { value: 's3', label: 'S3 Object Data', description: 'S3 buckets with Cross-Region Replication.', weight: 5, icon: '📦' },
        { value: 'rds-oracle', label: 'RDS Oracle', description: 'Oracle on RDS. Cross-region read replica (Data Guard) or logical export.', weight: 15, icon: '🏛️' },
        { value: 'rds-sqlserver', label: 'RDS SQL Server', description: 'SQL Server on RDS. Cross-region read replica (Enterprise) or BCP/DMS.', weight: 15, icon: '🔷' },
        { value: 'opensearch', label: 'OpenSearch', description: 'Search/analytics. Cross-cluster replication.', weight: 10, icon: '🔍' }
      ]
    },
    {
      id: 'network-topology', title: 'Network Topology', stateKey: 'networkTopology',
      question: 'What is your current network architecture?',
      description: 'Topology determines VPC design, routing, and security group strategy in the target region.',
      conditional: function (s) { return s.proceedPath === 'self-execution' && s.urgencyMode === 'architecture-strategy'; },
      columns: 3,
      options: [
        { value: 'single-vpc', label: 'Single VPC', description: 'Simple single-VPC deployment.', weight: 5, icon: '🏠' },
        { value: 'multi-vpc-tgw', label: 'Multi-VPC + Transit Gateway', description: 'Multiple VPCs connected via TGW.', weight: 15, icon: '🌐' },
        { value: 'hub-spoke', label: 'Hub-and-Spoke', description: 'Central inspection/shared services VPC with spoke VPCs.', weight: 20, icon: '🕸️' },
        { value: 'hybrid', label: 'On-prem + AWS Hybrid', description: 'Direct Connect or VPN to on-premises.', weight: 25, icon: '🔌' },
        { value: 'multi-region', label: 'Multi-Region (Partial)', description: 'Already have some multi-region presence.', weight: 10, icon: '🌍' }
      ]
    },
    // FIX #2: Network Security now comes AFTER Network Topology (was previously before it)
    {
      id: 'network-security', title: 'Network Security', stateKey: 'networkSecurity',
      question: 'What network security controls do you need to replicate?',
      description: 'Security group and NACL configurations must be mirrored in the target region.',
      conditional: function (s) { return s.proceedPath === 'self-execution' && s.urgencyMode === 'architecture-strategy'; },
      columns: 3,
      options: [
        { value: 'security-groups', label: 'Security Groups', description: 'Stateful instance-level firewall rules.', weight: 5, icon: '🛡️' },
        { value: 'nacls', label: 'NACLs', description: 'Stateless subnet-level network access control lists.', weight: 10, icon: '🚧' },
        { value: 'both', label: 'Both', description: 'Security Groups and NACLs — full network security replication.', weight: 15, icon: '🔒' }
      ]
    },
    {
      id: 'network-connectivity', title: 'Connectivity Method', stateKey: 'networkConnectivity',
      question: 'Primary connectivity to the target region?',
      description: 'How traffic will reach the target region from users or on-premises.',
      columns: 4,
      conditional: function (s) { return s.proceedPath === 'self-execution' && s.urgencyMode === 'architecture-strategy' && s.networkTopology !== 'multi-region'; },
      options: [
        { value: 'direct-connect', label: 'Direct Connect', description: 'Dedicated network connection to AWS.', weight: 25, icon: '🔌' },
        { value: 'transit-gateway', label: 'Transit Gateway Peering', description: 'TGW inter-region peering.', weight: 20, icon: '🌐' },
        { value: 'vpn', label: 'Site-to-Site VPN', description: 'Encrypted tunnel over public internet.', weight: 10, icon: '🔒' },
        { value: 'vpn-only', label: 'Internet Only', description: 'Cloud-native, no on-prem connectivity.', weight: 5, icon: '🌍' }
      ]
    },
    {
      id: 'compliance', title: 'Compliance Constraints', stateKey: 'compliance',
      question: 'Any regulatory or data residency requirements?',
      description: 'Compliance constraints affect region selection and data handling.',
      conditional: function (s) { return s.proceedPath === 'self-execution' && s.urgencyMode === 'architecture-strategy'; },
      columns: 3,
      options: [
        { value: 'data-residency', label: 'Data Residency', description: 'Data must stay in specific geographic boundaries.', weight: 15, icon: '📍' },
        { value: 'sovereignty', label: 'Data Sovereignty', description: 'Strict government control over data location and access.', weight: 20, icon: '🏛️' },
        { value: 'none', label: 'No Constraints', description: 'No specific regulatory requirements.', weight: 0, icon: '✅' }
      ]
    },
    {
      id: 'team-readiness', title: 'Team Readiness', stateKey: 'teamReadiness',
      question: 'How experienced is your team with multi-region AWS?',
      description: 'Team readiness affects timeline and support needs.',
      conditional: function (s) { return s.proceedPath === 'self-execution' && s.urgencyMode === 'architecture-strategy'; },
      columns: 3,
      options: [
        { value: 'experienced', label: 'Experienced', description: 'Team has done multi-region deployments before.', weight: 0, icon: '🏆' },
        { value: 'moderate', label: 'Some Experience', description: 'Familiar with AWS but not multi-region.', weight: 10, icon: '📘' },
        { value: 'beginner', label: 'New to This', description: 'First time doing cross-region work.', weight: 20, icon: '🌱' }
      ]
    },
    {
      id: 'additional-services', title: 'Additional AWS Services', stateKey: 'additionalServices',
      question: 'Which additional AWS services are part of this workload?',
      description: 'Select all that apply. Each selection adds service-specific migration steps to your runbook. If none apply, select "None of these".',
      conditional: function (s) { return s.proceedPath === 'self-execution' && s.urgencyMode === 'architecture-strategy'; },
      columns: 4,
      multiSelect: true,
      options: [
        { value: 'sns-sqs', label: 'SNS / SQS', description: 'Message queues and notification topics.', weight: 0, icon: '📨' },
        { value: 'waf', label: 'AWS WAF', description: 'Web application firewall rules.', weight: 0, icon: '🛡️' },
        { value: 'network-firewall', label: 'Network Firewall', description: 'VPC-level network firewall.', weight: 0, icon: '🔥' },
        { value: 'fsx', label: 'Amazon FSx', description: 'Managed file systems (Windows, ONTAP, Lustre).', weight: 0, icon: '📁' },
        { value: 'cognito', label: 'Amazon Cognito', description: 'User pools and identity federation.', weight: 0, icon: '👤' },
        { value: 'guardduty', label: 'Amazon GuardDuty', description: 'Threat detection service.', weight: 0, icon: '🔍' },
        { value: 'access-analyzer', label: 'IAM Access Analyzer', description: 'Resource policy analysis.', weight: 0, icon: '🔎' },
        { value: 'none', label: 'None of these', description: 'No additional services to migrate.', weight: 0, icon: '✅' }
      ]
    }
  ];

  // ============================================================
  // RULES_ENGINE — Maps selections to outcomes
  // ============================================================
  // FACT-CHECK SOURCES (verified March 2026):
  // - DR Strategies: https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/disaster-recovery-options-in-the-cloud.html
  // - Aurora Global Database: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-global-database.html
  // - DynamoDB Global Tables: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GlobalTables.html
  // - DocumentDB Global Clusters: https://docs.aws.amazon.com/documentdb/latest/developerguide/global-clusters.html
  // - ElastiCache Global Datastore: https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/Redis-Global-Datastore.html
  // - S3 Replication: https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication.html
  // - KMS: https://docs.aws.amazon.com/kms/latest/developerguide/overview.html
  // - Region Enablement: https://docs.aws.amazon.com/accounts/latest/reference/manage-acct-regions.html
  // - Control Planes vs Data Planes: https://docs.aws.amazon.com/whitepapers/latest/aws-fault-isolation-boundaries/control-planes-and-data-planes.html
  // - OpenSearch Cross-Cluster Replication: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/replication.html
  // - VPC: https://docs.aws.amazon.com/vpc/latest/userguide/what-is-amazon-vpc.html
  // - Route 53: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/Welcome.html
  // - CloudWatch: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/WhatIsCloudWatch.html
  // ============================================================
  var RULES_ENGINE = {
    getArchitecture: function (s) {
      if (s.urgencyMode === 'immediate-dr') return 'backup-restore'; // accelerated recovery = fastest viable
      var c = s.workloadCriticality, r = s.recoveryRequirements;
      if (c === 'tier-0' && r === 'rto-lt-1h') return 'active-active';
      if (c === 'tier-0') return 'warm-standby';
      if (c === 'tier-1' && (r === 'rto-lt-1h' || r === 'rto-1-4h')) return 'warm-standby';
      if (c === 'tier-1' && r === 'rto-4-24h') return 'pilot-light';
      if (c === 'tier-1') return 'backup-restore';
      return 'backup-restore';
    },
    getComplexity: function (s) {
      var total = 0, max = 0;
      WIZARD_STEPS.forEach(function (step) {
        if (!step.options) return;
        var maxW = Math.max.apply(null, step.options.map(function (o) { return o.weight; }));
        max += maxW;
        if (step.multiSelect) {
          var arr = s[step.stateKey] || [];
          if (arr.length) {
            var avgW = 0;
            arr.forEach(function (v) { var o = step.options.find(function (x) { return x.value === v; }); if (o) avgW += o.weight; });
            total += avgW / arr.length;
          }
        } else {
          var sel = step.options.find(function (o) { return o.value === s[step.stateKey]; });
          if (sel) total += sel.weight;
        }
      });
      // Add topology + multi-DB complexity
      var dbCount = (s.dbTypes || []).length;
      if (dbCount > 3) total += 15;
      else if (dbCount > 1) total += 8;
      var score = max > 0 ? Math.round((total / max) * 100) : 0;
      score = Math.min(score, 100);
      var level, cls;
      if (score <= 30) { level = 'Low'; cls = 'low'; }
      else if (score <= 60) { level = 'Medium'; cls = 'medium'; }
      else { level = 'High'; cls = 'high'; }
      return { score: score, level: level, cls: cls };
    },
    // Implementation timeline estimates
    // These represent time to SET UP the DR strategy, not the RTO.
    // Ref: AWS Prescriptive Guidance + Well-Architected Reliability Pillar
    // Timelines vary significantly by environment complexity, team readiness, and data volume.
    getTimeline: function (s) {
      if (s.urgencyMode === 'immediate-dr') return { label: 'Emergency (24–72 hours)', weeks: '0.5–1' };
      var c = this.getComplexity(s);
      var arch = this.getArchitecture(s);
      // Active/active takes longer to set up than simpler strategies
      if (arch === 'active-active') {
        if (c.score <= 30) return { label: 'Active/Active (2–4 weeks)', weeks: '2–4' };
        if (c.score <= 60) return { label: 'Active/Active (4–6 weeks)', weeks: '4–6' };
        return { label: 'Active/Active Complex (6–10 weeks)', weeks: '6–10' };
      }
      if (arch === 'warm-standby') {
        if (c.score <= 30) return { label: 'Warm Standby (1–2 weeks)', weeks: '1–2' };
        if (c.score <= 60) return { label: 'Warm Standby (2–4 weeks)', weeks: '2–4' };
        return { label: 'Warm Standby Complex (4–6 weeks)', weeks: '4–6' };
      }
      if (arch === 'pilot-light') {
        if (c.score <= 30) return { label: 'Pilot Light (1–2 weeks)', weeks: '1–2' };
        if (c.score <= 60) return { label: 'Pilot Light (2–3 weeks)', weeks: '2–3' };
        return { label: 'Pilot Light Complex (3–5 weeks)', weeks: '3–5' };
      }
      // backup-restore (simplest)
      if (c.score <= 30) return { label: 'Backup/Restore (Days–1 week)', weeks: '0.5–1' };
      if (c.score <= 60) return { label: 'Backup/Restore (1–2 weeks)', weeks: '1–2' };
      return { label: 'Backup/Restore Complex (2–4 weeks)', weeks: '2–4' };
    },
    getRiskLevel: function (s) {
      if (s.urgencyMode === 'immediate-dr') return { level: 'High', cls: 'high' };
      var c = this.getComplexity(s);
      var level, cls;
      if (c.score <= 30) { level = 'Low'; cls = 'low'; }
      else if (c.score <= 60) { level = 'Moderate'; cls = 'moderate'; }
      else { level = 'High'; cls = 'high'; }
      // Increase risk when no DR strategy
      if (s.drStrategy === 'none' || s.drStrategy === 'unknown') {
        if (level === 'Low') { level = 'Moderate'; cls = 'moderate'; }
        else if (level === 'Moderate') { level = 'High'; cls = 'high'; }
      }
      return { level: level, cls: cls };
    },
    getActions: function (s) {
      var a = [];
      // Landing zone
      if (s.landingZone === 'control-tower') {
        a.push({ text: 'Verify Control Tower guardrails cover target region', tag: 'Ops' });
        a.push({ text: 'Extend OU/SCP policies to target region', tag: 'Security' });
      } else if (s.landingZone === 'custom-lz') {
        a.push({ text: 'Review and replicate SCPs for target region', tag: 'Security' });
      } else {
        a.push({ text: 'Consider setting up AWS Organizations before migration', tag: 'Ops' });
      }
      // Network topology
      if (s.networkTopology === 'hub-spoke' || s.networkTopology === 'multi-vpc-tgw') {
        a.push({ text: 'Plan CIDR ranges for target region (avoid overlaps)', tag: 'Network' });
        a.push({ text: 'Replicate TGW route tables and attachments', tag: 'Network' });
        a.push({ text: 'Inventory and replicate security groups', tag: 'Network' });
      }
      if (s.networkConnectivity === 'direct-connect') {
        a.push({ text: 'Provision Direct Connect in target region', tag: 'Network' });
      }
      if (s.networkConnectivity === 'transit-gateway') {
        a.push({ text: 'Create TGW peering to target region', tag: 'Network' });
      }
      a.push({ text: 'Recreate VPC, subnets, security groups in target region', tag: 'Network' });
      // Data
      var dbs = s.dbTypes || [];
      dbs.forEach(function (db) {
        var labels = { aurora: 'Aurora Global Database', rds: 'RDS read replica', dynamodb: 'DynamoDB Global Table', documentdb: 'DocumentDB Global Cluster', elasticache: 'ElastiCache Global Datastore', s3: 'S3 Cross-Region Replication', 'rds-other': 'DMS replication', 'rds-oracle': 'Oracle cross-region replica / logical export', 'rds-sqlserver': 'SQL Server cross-region replica / BCP', opensearch: 'OpenSearch cross-cluster replication' };
        a.push({ text: 'Set up ' + (labels[db] || db) + ' replication', tag: 'Data' });
      });
      // App type
      if (s.appType === 'ec2') a.push({ text: 'Copy AMIs to target region', tag: 'App' });
      if (s.appType === 'containers') a.push({ text: 'Set up ECR replication to target region', tag: 'App' });
      if (s.appType === 'serverless') a.push({ text: 'Deploy Lambda functions via IaC in target region', tag: 'App' });
      a.push({ text: 'Configure Route 53 health checks and failover', tag: 'DNS' });
      a.push({ text: 'Create KMS keys in target region', tag: 'Security' });
      a.push({ text: 'Recreate IAM roles and policies', tag: 'Security' });
      a.push({ text: 'Set up CloudWatch monitoring in target region', tag: 'Ops' });
      a.push({ text: 'Create and test rollback plan', tag: 'Ops' });
      if (s.compliance === 'data-residency' || s.compliance === 'sovereignty') {
        a.push({ text: 'Validate data residency compliance in target region', tag: 'Security' });
      }
      return a;
    },
    getWaves: function (s) {
      var arch = this.getArchitecture(s);
      var isPanic = s.urgencyMode === 'immediate-dr';
      // Wave timeframes aligned to DR strategy complexity
      // Ref: https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/disaster-recovery-options-in-the-cloud.html
      var w1Time, w2Time, w3Time;
      if (isPanic) {
        w1Time = 'Hours 0–8'; w2Time = 'Hours 8–24'; w3Time = 'Hours 24–72';
      } else if (arch === 'active-active') {
        w1Time = 'Days 1–5'; w2Time = 'Week 1–3'; w3Time = 'Week 3–4';
      } else if (arch === 'warm-standby') {
        w1Time = 'Days 1–3'; w2Time = 'Week 1–2'; w3Time = 'Week 2–3';
      } else if (arch === 'pilot-light') {
        w1Time = 'Days 1–3'; w2Time = 'Days 3–7'; w3Time = 'Week 1–2';
      } else {
        // backup-restore
        w1Time = 'Days 1–2'; w2Time = 'Days 2–5'; w3Time = 'Days 5–7';
      }
      return {
        wave1: {
          title: isPanic ? 'Emergency Foundation' : 'Foundation & Networking',
          timeframe: w1Time,
          items: [
            isPanic ? 'Freeze changes in source region' : 'Enable target region (if opt-in)',
            'Request service quota increases',
            'Create VPC, subnets, route tables',
            'Create KMS keys',
            'Recreate IAM roles and policies',
            s.landingZone === 'control-tower' ? 'Extend Control Tower to target region' : 'Set up governance baseline'
          ],
          validation: 'VPC exists, quotas approved, IAM roles functional, KMS keys active',
          exitCriteria: 'All foundation resources created and validated'
        },
        wave2: {
          title: isPanic ? 'Critical Data + Minimal App' : 'Data & Compute Migration',
          timeframe: w2Time,
          items: [
            s.dataProfile && s.dataProfile.startsWith('stateful') ? 'Set up database replication' : 'Deploy stateless compute',
            s.appType === 'ec2' ? 'Copy AMIs and launch instances' : s.appType === 'containers' ? 'Replicate ECR images and deploy services' : 'Deploy Lambda functions via IaC',
            'Configure load balancers and target groups',
            'Recreate application integration services (SNS topics, SQS queues)',
            'Set up monitoring and alerting',
            isPanic ? 'Validate minimal viable service' : 'Run integration tests'
          ],
          validation: 'App deployed, health checks passing, data replication lag within RPO',
          exitCriteria: 'Application serving traffic in target region (test mode)'
        },
        wave3: {
          title: isPanic ? 'DNS Cutover + Stabilize' : 'Cutover & Validation',
          timeframe: w3Time,
          items: [
            'Configure Route 53 failover routing',
            isPanic ? 'Execute immediate DNS cutover' : 'Lower DNS TTLs before cutover',
            'Execute cutover during maintenance window',
            'Run end-to-end validation tests',
            isPanic ? 'Monitor for 24 hours' : 'Monitor for 48–72 hours post-cutover',
            'Decommission source region resources (if region exit)'
          ],
          validation: 'DNS resolves to target, all endpoints healthy, no errors in logs',
          exitCriteria: 'Migration declared successful, stakeholder sign-off'
        }
      };
    },
    getRisks: function (s) {
      var r = ['Data transfer times may exceed estimates — depends on volume, bandwidth, and network conditions', 'DNS propagation delays during cutover — cached resolvers may not honor low TTLs', 'Service quota limits may differ in target region — request increases early', 'Hardcoded region references in application config, environment variables, or SDK configurations', 'If using scripts or automations for migration, include retry with exponential backoff logic to handle API throttling gracefully (see: https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/retry-backoff.html)', 'If APIs are unresponsive for an AZ, migration from that AZ is not possible using AWS methods. If APIs are unresponsive for the entire Region, migration using AWS APIs is not possible', 'Inter-region networking may experience congestion during recovery periods due to other migrations and external traffic'];
      if (s.urgencyMode === 'immediate-dr') {
        r.unshift('ACCELERATED RECOVERY: Elevated risk of data loss — RPO may not be met due to replication lag');
        r.unshift('ACCELERATED RECOVERY: Reduced testing window increases failure risk — validate critical paths first');
        r.push('Compliance validation may be incomplete under time pressure — document gaps for post-incident review');
      }
      if (s.networkConnectivity === 'direct-connect') r.push('Direct Connect provisioning lead time (weeks to months) — consider VPN as temporary bridge');
      if (s.sourceS3Availability === 'impaired') r.push('S3 IMPAIRED: Snapshot-based migration methods (RDS snapshot copy, cross-region automated backups, S3-based export/import) are unavailable. Use read replica promotion, logical export (pg_dump, mysqldump, BCP, Data Pump via DB link), or DMS instead.');
      if (s.sourceS3Availability === 'unknown') r.push('S3 status unknown — verify S3 availability via the AWS Health Dashboard before relying on snapshot-based migration methods.');
      if (s.dataProfile === 'stateful-large') r.push('Large data volumes may require extended replication window — monitor replication lag continuously');
      if (s.compliance === 'sovereignty') r.push('Data sovereignty may limit target region options — validate with legal/compliance team');
      if (s.teamReadiness === 'beginner') r.push('Team may need additional training — consider engaging AWS support or a partner. Practice migration steps in a non-production environment first.');
      if ((s.dbTypes || []).length > 3) r.push('Multiple database types increase migration complexity — consider phased approach');
      if (s.networkTopology === 'hub-spoke') r.push('Hub-and-spoke topology requires careful route table replication — validate end-to-end connectivity');
      // RPO-driven risks
      if (s.rpo === 'near-zero') r.push('Near-zero RPO requires continuous replication with minimal lag — higher cost and complexity. Verify replication lag metrics continuously.');
      else if (s.rpo === 'lt-15m') r.push('RPO < 15 min requires frequent async replication or log shipping — monitor replication lag closely.');
      else if (s.rpo === 'lt-1h') r.push('RPO < 1 hour typically requires asynchronous replication with frequent snapshots or log shipping. Ensure snapshot schedules and replication intervals are configured to meet this objective.');
      else if (s.rpo === 'lt-24h') r.push('RPO < 24 hours allows daily backup/restore approaches — ensure backup schedules are active and tested.');
      // DR strategy and backup location risks
      if (s.drStrategy === 'none' || s.drStrategy === 'unknown') {
        r.push('No established DR strategy — recovery will take longer and carry higher risk. Consider implementing a DR strategy post-incident.');
      }
      if (s.backupLocation === 'same-region') {
        r.push('Backups stored in the same region as production — if the region is impaired, backups may be inaccessible. Consider cross-region backup replication.');
      }
      return r;
    },

    // ============================================================
    // getRunbookSteps — Dynamic runbook based on ALL dimensions
    // ============================================================
    getRunbookSteps: function (s) {
      var arch = this.getArchitecture(s);
      var steps = [];
      var isPanic = s.urgencyMode === 'immediate-dr';

      // ============================================================
      // Step: AWS Health Dashboard & Support Escalation
      // Always first — check what's happening before taking action
      // Ref: https://docs.aws.amazon.com/health/latest/ug/what-is-aws-health.html
      // ============================================================
      steps.push({
        title: isPanic ? 'URGENT: Check AWS Health Dashboard & Open Support Case' : 'Check AWS Health Dashboard & Service Status',
        owner: 'Customer', complexity: 'Low',
        prereqs: ['AWS Console access'],
        description: isPanic
          ? 'Check the AWS Health Dashboard to understand the scope of disruption. Open a support case immediately (Business/Enterprise Support). Engage your TAM if available. If APIs (including CLI) are unresponsive for an AZ, migration from that AZ is not possible using AWS methods. If APIs are unresponsive for the entire Region, migration using AWS methods is not possible. Inter-region migrations will have higher latency and may experience congestion during recovery. Console down? Try a direct regional endpoint. Multi-session enabled? Disable it via account menu or clear cookies. No local CLI? Use AWS CloudShell.'
          : 'Review the AWS Health Dashboard for ongoing events in your source region. Check service-specific health for the services you depend on. If APIs (including CLI) are unresponsive for an AZ, migration from that AZ is not possible using AWS methods. If APIs are unresponsive for the entire Region, migration using AWS methods is not possible. Inter-region migrations will have higher latency and may experience congestion during recovery. Console down? Try a direct regional endpoint. Multi-session enabled? Disable it via account menu or clear cookies. No local CLI? Use AWS CloudShell.',
        refs: [
          { label: 'AWS Health Dashboard', url: 'https://health.aws.amazon.com/health/home' },
          { label: 'AWS Service Health Dashboard (public)', url: 'https://status.aws.amazon.com/' },
          { label: 'Console regional endpoints (troubleshooting)', url: 'https://docs.aws.amazon.com/general/latest/gr/mgmt-console.html' },
          { label: 'AWS CloudShell User Guide', url: 'https://docs.aws.amazon.com/cloudshell/latest/userguide/welcome.html' },
          { label: 'Region migration guide (re:Post)', url: 'https://repost.aws/articles/ARgWzmR04xQSiPsgpe18T2Hw' }
        ],
        commands: [
          '# ── Check AWS Health Dashboard ──',
          '# Console: https://health.aws.amazon.com/health/home',
          '# Or via CLI:',
          'aws health describe-events --filter eventStatusCodes=open --region us-east-1',
          'aws health describe-event-details --event-arns <EVENT_ARN> --region us-east-1',
          '',
          '# ── Check service-specific health ──',
          'aws health describe-affected-entities --filter eventArns=<EVENT_ARN> --region us-east-1',
          '',
          '# ── Console troubleshooting ──',
          '# If console is unresponsive, try a direct regional endpoint:',
          '# https://us-east-1.console.aws.amazon.com',
          '# https://eu-west-1.console.aws.amazon.com',
          '# Full list: https://docs.aws.amazon.com/general/latest/gr/mgmt-console.html',
          '',
          '# ── CloudShell fallback (if no local CLI) ──',
          '# Open CloudShell from any working region console:',
          '# https://docs.aws.amazon.com/cloudshell/latest/userguide/welcome.html',
          '',
          isPanic ? '# ── Open support case (Business/Enterprise Support) ──' : '# ── Optional: Open support case for guidance ──',
          'aws support create-case --subject "Service impairment — recovery activation" \\',
          '  --communication-body "Requesting guidance for region exit from <SOURCE_REGION>" \\',
          '  --service-code amazon-ec2 --category-code other \\',
          '  --severity-code ' + (isPanic ? 'urgent' : 'normal') + ' --language en',
          '',
          '# ── Check AWS Service Health Dashboard (public) ──',
          '# https://status.aws.amazon.com/'
        ],
        validation: [
          'AWS Health Dashboard reviewed',
          'Scope of disruption understood (regional vs service-specific)',
          'API availability confirmed for source region (if APIs are unresponsive, migration via AWS methods is not possible)',
          isPanic ? 'Support case opened' : 'Service health status documented',
          'Decision made: proceed with region exit or wait'
        ],
        rollback: 'N/A — information gathering only.'
      });

      // Step: Environment Discovery Advisory (Strategy Mode only)
      // Added as an early step to recommend running the discovery script
      if (s.urgencyMode === 'architecture-strategy') {
        steps.push({
          title: 'Environment Discovery (Recommended)',
          owner: 'Customer', complexity: 'Low',
          prereqs: ['AWS CLI configured'],
          description: 'If you want a quick way to understand what exists in your environment before planning recovery or migration, run the Environment Discovery Script. Download it from the RMA homepage. The script scans all enabled regions using read-only API calls and produces two CSV files: resources-inventory.csv (complete resource inventory) and resource-dependencies.csv (dependency map between resources). These files help you identify what needs to be recovered, what depends on what, and what might be missed. Alternative: For a managed solution, see AWS Workload Discovery on AWS.',
          refs: [
            { label: 'AWS Workload Discovery on AWS', url: 'https://aws.amazon.com/solutions/implementations/workload-discovery-on-aws/' }
          ],
          commands: [
            '# Download the script from the RMA homepage, then:',
            'chmod +x rma-environment-discovery.sh',
            './rma-environment-discovery.sh',
            '',
            '# Output files:',
            '# resources-inventory.csv — complete resource inventory',
            '# resource-dependencies.csv — dependency map'
          ],
          validation: ['Discovery script executed successfully', 'CSV files generated and reviewed'],
          rollback: 'N/A — read-only discovery, no changes made.'
        });
      }

      // ACCELERATED RECOVERY: Step — Freeze & Capture
      if (isPanic) {
        steps.push({
          title: 'ACCELERATED RECOVERY: Freeze Changes & Capture Current State',
          owner: 'Shared', complexity: 'High',
          prereqs: ['Incident declared', 'Decision authority confirmed'],
          description: 'Immediately freeze all deployments and changes in the source region. Capture current infrastructure state for reference. This is the starting point for emergency recovery.',
          commands: [
            '# Freeze deployments — disable CI/CD pipelines',
            '# Document current running state',
            'aws ec2 describe-instances --filters "Name=instance-state-name,Values=running" --region <SOURCE_REGION> --output json > ec2-inventory.json',
            'aws rds describe-db-instances --region <SOURCE_REGION> --output json > rds-inventory.json',
            'aws ecs list-services --cluster <CLUSTER_NAME> --region <SOURCE_REGION> > ecs-inventory.json',
            'aws s3 ls --region <SOURCE_REGION> > s3-inventory.txt',
            '# Capture VPC/networking state',
            'aws ec2 describe-vpcs --region <SOURCE_REGION> --output json > vpc-state.json',
            'aws ec2 describe-security-groups --region <SOURCE_REGION> --output json > sg-state.json'
          ],
          validation: ['All CI/CD pipelines paused', 'Infrastructure inventory captured', 'Team notified of freeze'],
          rollback: 'N/A — this is the starting point.'
        });
      }

      // Step: Landing Zone Readiness
      if (s.landingZone === 'control-tower') {
        steps.push({
          title: 'Verify Control Tower / LZA Readiness',
          owner: 'Customer', complexity: 'Medium',
          prereqs: ['Control Tower deployed', 'Admin access to management account'],
          description: 'Ensure Control Tower guardrails, OUs, and SCPs cover the target region. Verify centralized logging (CloudTrail, Config) is active. Check that account vending can provision in the target region.',
          commands: [
            '# List enabled controls (must be called from Control Tower home region)',
            'aws controltower list-enabled-controls --target-identifier arn:aws:organizations::<ACCOUNT_ID>:ou/<OU_ID> --region <CT_HOME_REGION>',
            '# Verify CloudTrail is logging in target region',
            'aws cloudtrail get-trail-status --name <TRAIL_NAME> --region <TARGET_REGION>',
            '# Check Config recorder',
            'aws configservice describe-configuration-recorders --region <TARGET_REGION>'
          ],
          validation: ['Target region is governed by Control Tower', 'CloudTrail active in target region', 'Config recorder running', 'SCPs allow required services in target region'],
          rollback: 'N/A — governance verification only.'
        });
      } else if (s.landingZone === 'custom-lz') {
        steps.push({
          title: 'Verify Custom Landing Zone Readiness',
          owner: 'Customer', complexity: 'Medium',
          prereqs: ['AWS Organizations configured', 'SCP policies documented'],
          description: 'Review SCPs to ensure they allow operations in the target region. Verify centralized logging and IAM boundaries are configured.',
          commands: [
            '# List SCPs attached to target OU',
            'aws organizations list-policies-for-target --target-id <OU_ID> --filter SERVICE_CONTROL_POLICY',
            '# Verify region is not denied by SCP',
            '# Check CloudTrail',
            'aws cloudtrail describe-trails --region <TARGET_REGION>'
          ],
          validation: ['SCPs do not block target region', 'Logging active', 'IAM boundaries configured'],
          rollback: 'Update SCPs if target region is blocked.'
        });
      }

      // Step: Enable Target Region & Quotas
      steps.push({
        title: isPanic ? 'URGENT: Enable Region & Request Quotas' : 'Enable Target Region & Request Quotas',
        owner: 'Customer', complexity: 'Low',
        prereqs: ['AWS account access', 'Target region identified'],
        description: 'Opt-in regions (launched after March 20, 2019) are disabled by default — enable before use. Default regions are always enabled. Service quotas are per-region — compare source and target, then request increases as early as possible. Use the Service Quotas Replicator tool to automate comparison. For urgent requests, open a support case.',
        refs: [
          { label: 'Enable region (standalone accounts)', url: 'https://docs.aws.amazon.com/accounts/latest/reference/manage-acct-regions.html#manage-acct-regions-enable-standalone' },
          { label: 'Enable region (Organization accounts)', url: 'https://docs.aws.amazon.com/accounts/latest/reference/manage-acct-regions.html#manage-acct-regions-enable-organization' },
          { label: 'Regional availability reference (opt-in vs default)', url: 'https://docs.aws.amazon.com/accounts/latest/reference/manage-acct-regions.html#manage-acct-regions-regional-availability' },
          { label: 'Service Quotas Replicator tool', url: 'https://github.com/aws-samples/sample-service-quotas-replicator-for-aws' },
          { label: 'View service quotas', url: 'https://docs.aws.amazon.com/servicequotas/latest/userguide/gs-request-quota.html' },
          { label: 'Request quota increase', url: 'https://docs.aws.amazon.com/servicequotas/latest/userguide/request-quota-increase.html' },
          { label: 'Open support case for urgent quota requests', url: 'https://docs.aws.amazon.com/awssupport/latest/user/create-service-quota-increase.html' }
        ],
        commands: [
          '# ── Check if target region is opt-in and enable if needed ──',
          'aws account get-region-opt-status --region-name <TARGET_REGION>',
          'aws account enable-region --region-name <TARGET_REGION>',
          '',
          '# ── For accounts in an Organization (management account only) ──',
          '# aws organizations enable-aws-service-access --service-principal account.amazonaws.com',
          '# aws account enable-region --region-name <TARGET_REGION> --account-id <MEMBER_ACCOUNT_ID>',
          '',
          '# ── Compare quotas between source and target regions ──',
          '# Recommended: Use the Service Quotas Replicator tool:',
          '# https://github.com/aws-samples/sample-service-quotas-replicator-for-aws',
          '',
          '# ── Manual quota comparison ──',
          'aws service-quotas list-service-quotas --service-code ec2 --region <SOURCE_REGION> --output table',
          'aws service-quotas list-service-quotas --service-code ec2 --region <TARGET_REGION> --output table',
          '',
          '# ── Request quota increases ──',
          'aws service-quotas request-service-quota-increase --service-code ec2 --quota-code L-1216C47A --desired-value 100 --region <TARGET_REGION>',
          '',
          '# ── For urgent requests, open a support case ──',
          '# aws support create-case --subject "Urgent: Service quota increase for region migration" \\',
          '#   --communication-body "Migrating from <SOURCE_REGION> to <TARGET_REGION>. Need quota parity." \\',
          '#   --service-code service-quotas --category-code other --severity-code urgent --language en'
        ],
        validation: ['Region status ENABLED (or confirmed as default region)', 'Quota requests submitted for all critical services', 'Quota comparison completed between source and target regions'],
        rollback: 'Region can be disabled if no resources created.'
      });

      // Step: KMS Keys
      steps.push({
        title: 'Create KMS Keys in Target Region',
        owner: 'Shared', complexity: 'Low',
        prereqs: ['Target region enabled'],
        description: 'KMS keys are regional and cannot be moved or copied across regions. Create equivalent keys in the target region for encrypting EBS, RDS, S3, and other resources. Ensure key policies grant appropriate access. When copying encrypted snapshots cross-region, you must specify a KMS key in the target region. For multi-region key support, see: https://docs.aws.amazon.com/kms/latest/developerguide/multi-region-keys-overview.html',
        refs: [
          { label: 'KMS Overview', url: 'https://docs.aws.amazon.com/kms/latest/developerguide/overview.html' },
          { label: 'Multi-Region KMS keys', url: 'https://docs.aws.amazon.com/kms/latest/developerguide/multi-region-keys-overview.html' }
        ],
        commands: [
          'aws kms create-key --description "Migration key" --region <TARGET_REGION>',
          'aws kms create-alias --alias-name alias/migration-primary --target-key-id <KEY_ID> --region <TARGET_REGION>'
        ],
        validation: ['Key state is Enabled', 'Alias resolves to correct key'],
        rollback: 'Schedule key deletion with aws kms schedule-key-deletion.'
      });

      // Step: IAM
      steps.push({
        title: 'Recreate IAM Roles & Policies',
        owner: 'Customer', complexity: 'Medium',
        prereqs: ['Source IAM roles documented'],
        description: 'IAM is global — roles and policies exist across all regions. However, resource-based policies may reference region-specific ARNs (S3 buckets, KMS keys) — update these for the target region. Configure workloads to use regional STS endpoints instead of the global endpoint for better resilience. In opt-in regions, the global STS endpoint is served by us-east-1 only. For SAML 2.0 federation, use regional sign-in endpoints for resilient console access.',
        refs: [
          { label: 'Security/Identity migration guide (re:Post)', url: 'https://repost.aws/articles/AROjnVwGlvRx2vESS9wrQEJQ' },
          { label: 'STS regional endpoints', url: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_temp_region-endpoints.html' },
          { label: 'IAM documentation', url: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/introduction.html' }
        ],
        commands: [
          'aws iam create-role --role-name MigrationAppRole --assume-role-policy-document file://trust-policy.json',
          'aws iam attach-role-policy --role-name MigrationAppRole --policy-arn arn:aws:iam::<ACCOUNT_ID>:policy/AppPolicy',
          'aws sts assume-role --role-arn arn:aws:iam::<ACCOUNT_ID>:role/MigrationAppRole --role-session-name test',
          '',
          '# ── Configure regional STS endpoints for resilience ──',
          '# In ~/.aws/config, add:',
          '#   [default]',
          '#   sts_regional_endpoints = regional',
          '# Or set environment variable:',
          '# export AWS_STS_REGIONAL_ENDPOINTS=regional',
          '',
          '# ── Verify STS regional endpoint works ──',
          'aws sts get-caller-identity --region <TARGET_REGION>'
        ],
        validation: ['Roles exist', 'Policies attached', 'STS assume-role succeeds', 'Regional STS endpoints configured'],
        rollback: 'Detach policies and delete roles.'
      });

      // Step: Secrets, Parameters & Certificates
      // Ref: https://docs.aws.amazon.com/secretsmanager/latest/userguide/intro.html
      // Ref: https://docs.aws.amazon.com/acm/latest/userguide/acm-overview.html
      steps.push({
        title: 'Replicate Secrets, Parameters & TLS Certificates',
        owner: 'Customer', complexity: 'Medium',
        prereqs: ['KMS keys created in target region', 'IAM roles configured'],
        description: 'Secrets Manager secrets, SSM Parameter Store parameters, and ACM certificates are regional. Recreate or replicate them in the target region. For Secrets Manager, use multi-region secret replication or manually recreate. For ACM, request or import new certificates — ACM certificates cannot be copied across regions. For SSM parameters, export and recreate. ⚠ If Secrets Manager or Parameter Store in the source region is impaired, ensure credentials and connection details are available through documented break-glass procedures or secure offline records. Do not store credentials in plaintext — use your organization\'s approved emergency credential recovery process.',
        refs: [
          { label: 'Security/Identity migration guide (re:Post)', url: 'https://repost.aws/articles/AROjnVwGlvRx2vESS9wrQEJQ' },
          { label: 'Secrets Manager docs', url: 'https://docs.aws.amazon.com/secretsmanager/latest/userguide/intro.html' },
          { label: 'ACM docs', url: 'https://docs.aws.amazon.com/acm/latest/userguide/acm-overview.html' }
        ],
        commands: [
          '# ── Secrets Manager: replicate secrets to target region ──',
          'aws secretsmanager replicate-secret-to-regions --secret-id <SECRET_ID> --add-replica-regions Region=<TARGET_REGION>',
          '',
          '# Or manually recreate if replication is not suitable',
          'aws secretsmanager get-secret-value --secret-id <SECRET_ID> --region <SOURCE_REGION> --query SecretString --output text',
          'aws secretsmanager create-secret --name <SECRET_NAME> --secret-string "<VALUE>" --kms-key-id <TARGET_KMS_KEY> --region <TARGET_REGION>',
          '',
          '# ── SSM Parameter Store: export and recreate ──',
          'aws ssm get-parameters-by-path --path "/" --recursive --region <SOURCE_REGION> --output json > ssm-params.json',
          'aws ssm put-parameter --name <PARAM_NAME> --value "<VALUE>" --type SecureString --key-id <TARGET_KMS_KEY> --region <TARGET_REGION>',
          '',
          '# ── ACM: request new certificate in target region ──',
          '# Note: ACM certificates cannot be copied cross-region. Request new or import.',
          'aws acm request-certificate --domain-name <DOMAIN> --validation-method DNS --region <TARGET_REGION>',
          '# Or import existing certificate',
          'aws acm import-certificate --certificate fileb://cert.pem --private-key fileb://key.pem --certificate-chain fileb://chain.pem --region <TARGET_REGION>'
        ],
        validation: ['Secrets accessible in target region', 'SSM parameters recreated', 'ACM certificate issued or imported and validated', 'Application config references updated to target-region ARNs'],
        rollback: 'Delete secrets, parameters, and certificates in target region.'
      });

      // Step: Compliance & Region Eligibility Validation — conditional on compliance selection
      if (s.compliance === 'data-residency' || s.compliance === 'sovereignty') {
        steps.push({
          title: 'Compliance & Region Eligibility Validation',
          owner: 'Customer', complexity: 'Medium',
          prereqs: ['Target region identified', 'Compliance/legal team engaged'],
          description: 'Validate that the target region meets your data residency and sovereignty requirements. Confirm encryption, key management, logging, and backup configurations comply with regulations. Ensure all replicas, logs, and support processes remain within allowed jurisdictions. Obtain stakeholder and compliance sign-off before proceeding with infrastructure provisioning.',
          refs: [
            { label: 'AWS Compliance: Services in Scope', url: 'https://aws.amazon.com/compliance/services-in-scope/' },
            { label: 'Regional Service Availability', url: 'https://aws.amazon.com/about-aws/global-infrastructure/regional-product-services/' }
          ],
          commands: [
            '# ── Verify target region is in allowed jurisdiction ──',
            '# Review your data residency policy against the target region location',
            '',
            '# ── Verify KMS key policies restrict to allowed regions ──',
            'aws kms describe-key --key-id <KEY_ID> --region <TARGET_REGION>',
            '',
            '# ── Verify CloudTrail logs stay in compliant regions ──',
            'aws cloudtrail describe-trails --region <TARGET_REGION>',
            '',
            '# ── Verify S3 bucket policies enforce region restrictions ──',
            'aws s3api get-bucket-policy --bucket <BUCKET_NAME>',
            '',
            '# ── Verify backup vault is in compliant region ──',
            'aws backup describe-backup-vault --backup-vault-name Default --region <TARGET_REGION>'
          ],
          validation: [
            'Target region confirmed within allowed jurisdiction',
            'KMS keys configured with compliant policies',
            'CloudTrail logging to compliant storage',
            'S3 replication destinations within allowed regions',
            'Backup copies stored in compliant regions',
            'Compliance/legal team sign-off obtained'
          ],
          rollback: 'N/A — validation only. If compliance cannot be confirmed, select a different target region.'
        });
      }

      // Step: Team Readiness Advisory — conditional on beginner team
      if (s.teamReadiness === 'beginner') {
        steps.push({
          title: 'Team Readiness: Guided Execution Advisory',
          owner: 'Customer', complexity: 'Low',
          prereqs: ['Team identified for migration execution'],
          description: 'Your team is new to multi-region AWS operations. Before executing the migration, consider engaging AWS Support (Business or Enterprise tier) or an AWS partner for hands-on guidance. Practice each runbook step in a non-production environment first. Add extra validation checkpoints between major phases. Document every step taken for post-migration review.',
          commands: [
            '# ── Verify AWS Support plan level ──',
            'aws support describe-trusted-advisor-checks --language en --query "checks[0].id" 2>&1 || echo "Support API not available — check your support plan level"',
            '',
            '# ── Consider creating a sandbox/test environment first ──',
            '# Deploy a minimal version of your stack in the target region',
            '# Practice the migration steps before executing on production',
            '',
            '# ── Useful training resources ──',
            '# AWS Skill Builder: https://skillbuilder.aws/',
            '# Well-Architected Labs: https://wellarchitectedlabs.com/'
          ],
          validation: [
            'AWS Support plan confirmed (Business or Enterprise recommended)',
            'Non-production rehearsal completed (if time permits)',
            'Team briefed on runbook steps',
            'Escalation contacts identified'
          ],
          rollback: 'N/A — advisory only.'
        });
      }

      // Step: VPC & Networking (topology-aware)
      var netDesc = 'Create VPC and networking infrastructure in the target region.';
      var netCmds = [
        'aws ec2 create-vpc --cidr-block 10.1.0.0/16 --region <TARGET_REGION> --tag-specifications "ResourceType=vpc,Tags=[{Key=Name,Value=migration-vpc}]"',
        '',
        '# Create Internet Gateway and attach to VPC',
        'aws ec2 create-internet-gateway --region <TARGET_REGION>',
        'aws ec2 attach-internet-gateway --internet-gateway-id <IGW_ID> --vpc-id <VPC_ID> --region <TARGET_REGION>',
        '',
        '# Create public and private subnets in multiple AZs',
        'aws ec2 create-subnet --vpc-id <VPC_ID> --cidr-block 10.1.1.0/24 --availability-zone <TARGET_REGION>a --region <TARGET_REGION> --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=public-a}]"',
        'aws ec2 create-subnet --vpc-id <VPC_ID> --cidr-block 10.1.2.0/24 --availability-zone <TARGET_REGION>b --region <TARGET_REGION> --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=public-b}]"',
        'aws ec2 create-subnet --vpc-id <VPC_ID> --cidr-block 10.1.10.0/24 --availability-zone <TARGET_REGION>a --region <TARGET_REGION> --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=private-a}]"',
        'aws ec2 create-subnet --vpc-id <VPC_ID> --cidr-block 10.1.11.0/24 --availability-zone <TARGET_REGION>b --region <TARGET_REGION> --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=private-b}]"',
        '',
        '# Create NAT Gateway (requires Elastic IP)',
        'aws ec2 allocate-address --domain vpc --region <TARGET_REGION>',
        'aws ec2 create-nat-gateway --subnet-id <PUBLIC_SUBNET_ID> --allocation-id <EIP_ALLOC_ID> --region <TARGET_REGION>',
        '',
        '# Create and configure route tables',
        'aws ec2 create-route-table --vpc-id <VPC_ID> --region <TARGET_REGION> --tag-specifications "ResourceType=route-table,Tags=[{Key=Name,Value=public-rt}]"',
        'aws ec2 create-route --route-table-id <PUBLIC_RT_ID> --destination-cidr-block 0.0.0.0/0 --gateway-id <IGW_ID> --region <TARGET_REGION>',
        'aws ec2 create-route-table --vpc-id <VPC_ID> --region <TARGET_REGION> --tag-specifications "ResourceType=route-table,Tags=[{Key=Name,Value=private-rt}]"',
        'aws ec2 create-route --route-table-id <PRIVATE_RT_ID> --destination-cidr-block 0.0.0.0/0 --nat-gateway-id <NAT_GW_ID> --region <TARGET_REGION>',
        '',
        '# Associate subnets with route tables',
        'aws ec2 associate-route-table --route-table-id <PUBLIC_RT_ID> --subnet-id <PUBLIC_SUBNET_ID> --region <TARGET_REGION>',
        'aws ec2 associate-route-table --route-table-id <PRIVATE_RT_ID> --subnet-id <PRIVATE_SUBNET_ID> --region <TARGET_REGION>',
        '',
        '# Create DB subnet group (required for RDS/Aurora/DocumentDB)',
        'aws rds create-db-subnet-group --db-subnet-group-name migration-db-subnets --db-subnet-group-description "DR DB subnets" --subnet-ids <PRIVATE_SUBNET_A> <PRIVATE_SUBNET_B> --region <TARGET_REGION>',
        '',
        '# Create security group',
        'aws ec2 create-security-group --group-name app-sg --description "App SG" --vpc-id <VPC_ID> --region <TARGET_REGION>'
      ];
      var netPrereqs = ['CIDR ranges planned (non-overlapping)'];
      if (s.networkTopology === 'multi-vpc-tgw' || s.networkTopology === 'hub-spoke') {
        netDesc = 'Replicate multi-VPC topology in target region. Create TGW, VPCs, route tables, and security groups. Ensure CIDR ranges do not overlap with source.';
        netCmds.push('');
        netCmds.push('# Create Transit Gateway in target region');
        netCmds.push('aws ec2 create-transit-gateway --description "Target TGW" --region <TARGET_REGION>');
        netCmds.push('aws ec2 create-transit-gateway-vpc-attachment --transit-gateway-id <TGW_ID> --vpc-id <VPC_ID> --subnet-ids <SUBNET_ID> --region <TARGET_REGION>');
        netPrereqs.push('Source TGW route tables documented');
      }
      if (s.networkTopology === 'hub-spoke') {
        netCmds.push('');
        netCmds.push('# Create inspection/shared-services VPC');
        netCmds.push('aws ec2 create-vpc --cidr-block 10.0.0.0/16 --region <TARGET_REGION> --tag-specifications "ResourceType=vpc,Tags=[{Key=Name,Value=shared-services-vpc}]"');
        netPrereqs.push('Inspection VPC design documented');
      }
      netCmds.push('');
      netCmds.push('# Inventory and replicate security groups');
      netCmds.push('aws ec2 describe-security-groups --region <SOURCE_REGION> --output json > sg-source.json');
      netCmds.push('# Recreate each SG with same rules in target region');

      steps.push({
        title: 'Create VPC & Network Infrastructure',
        owner: 'Shared', complexity: s.networkTopology === 'hub-spoke' ? 'High' : 'Medium',
        prereqs: netPrereqs,
        description: netDesc,
        refs: [
          { label: 'Networking migration guide (re:Post)', url: 'https://repost.aws/articles/ARSGx1LTcRTQu7QUVNfXSOrQ' },
          { label: 'VPC documentation', url: 'https://docs.aws.amazon.com/vpc/latest/userguide/what-is-amazon-vpc.html' },
          { label: 'Transit Gateway peering', url: 'https://docs.aws.amazon.com/vpc/latest/tgw/tgw-peering.html' }
        ],
        commands: netCmds,
        validation: ['VPC exists with correct CIDR', 'IGW attached', 'NAT Gateway available', 'Subnets in multiple AZs (public + private)', 'Route tables configured (public via IGW, private via NAT)', 'DB subnet group created', 'Security groups replicated', s.networkTopology === 'hub-spoke' ? 'TGW attachments active' : 'Routes verified'],
        rollback: 'Delete in reverse: SGs, DB subnet groups, NAT GW, EIP, route tables, subnets, IGW, TGW attachments, VPCs.'
      });

      // Step: Connectivity (conditional)
      if (s.networkConnectivity === 'direct-connect') {
        steps.push({
          title: 'Provision Direct Connect', owner: 'Shared', complexity: 'High',
          prereqs: ['Physical cross-connect ordered', 'LOA received', 'Lead time: weeks to months depending on location'],
          description: 'Provision DX connection, virtual interfaces, and DX Gateway. Note: Direct Connect provisioning involves physical infrastructure and has significant lead times. Plan accordingly. Consider VPN as a temporary bridge while DX is being provisioned.',
          commands: [
            'aws directconnect create-connection --location <DX_LOCATION> --bandwidth 1Gbps --connection-name migration-dx --region <TARGET_REGION>',
            'aws directconnect create-direct-connect-gateway --direct-connect-gateway-name migration-dxgw',
            'aws directconnect create-direct-connect-gateway-association --direct-connect-gateway-id <DXGW_ID> --gateway-id <VGW_ID>'
          ],
          validation: ['Connection state available', 'VIF state available with BGP up', 'End-to-end connectivity test passes'],
          rollback: 'Delete VIFs, then connection. Physical deprovisioning takes weeks.'
        });
      } else if (s.networkConnectivity === 'transit-gateway') {
        steps.push({
          title: 'Configure TGW Inter-Region Peering', owner: 'Shared', complexity: 'Medium',
          prereqs: ['Source TGW exists'],
          description: 'Create TGW peering between source and target regions.',
          commands: [
            'aws ec2 create-transit-gateway-peering-attachment --transit-gateway-id <TGW_ID> --peer-transit-gateway-id <PEER_TGW_ID> --peer-region <SOURCE_REGION> --region <TARGET_REGION>',
            'aws ec2 accept-transit-gateway-peering-attachment --transit-gateway-attachment-id <ATTACHMENT_ID> --region <SOURCE_REGION>'
          ],
          validation: ['Peering state available', 'Routes propagated', 'Cross-region ping succeeds'],
          rollback: 'Delete peering attachment and remove routes.'
        });
      } else if (s.networkConnectivity === 'vpn') {
        steps.push({
          title: 'Establish Site-to-Site VPN', owner: 'Customer', complexity: 'Low',
          prereqs: ['Customer gateway IP known'],
          description: 'Create VPN connection to target region.',
          commands: [
            'aws ec2 create-vpn-gateway --type ipsec.1 --region <TARGET_REGION>',
            'aws ec2 attach-vpn-gateway --vpn-gateway-id <VGW_ID> --vpc-id <VPC_ID> --region <TARGET_REGION>',
            'aws ec2 create-customer-gateway --type ipsec.1 --public-ip <ON_PREM_IP> --bgp-asn 65000 --region <TARGET_REGION>',
            'aws ec2 create-vpn-connection --type ipsec.1 --customer-gateway-id <CGW_ID> --vpn-gateway-id <VGW_ID> --region <TARGET_REGION>'
          ],
          validation: ['VPN state available', 'Both tunnels UP', 'BGP routes propagated'],
          rollback: 'Delete VPN connection, detach VGW, delete CGW.'
        });
      }

      // ============================================================
      // PHASE: Network Security — SG and/or NACL replication
      // Ref: https://docs.aws.amazon.com/vpc/latest/userguide/vpc-security-groups.html
      // Must come after VPC creation, before data replication or compute.
      // ============================================================
      if (s.networkSecurity === 'security-groups' || s.networkSecurity === 'both') {
        steps.push({
          title: 'Replicate Security Groups to Target Region',
          owner: 'Customer', complexity: 'Medium',
          prereqs: ['Target VPC created', 'Security group rules documented from source region'],
          description: 'Capture all security group configurations from the source region, recreate them in the target region with matching inbound/outbound rules, and validate that rules are correctly applied.',
          commands: [
            '# ── CAPTURE: Export all security groups from source region ──',
            'aws ec2 describe-security-groups --region <SOURCE_REGION> --output json > sg-source-export.json',
            '',
            '# ── RECREATE: Create security groups in target region ──',
            'aws ec2 create-security-group --group-name <SG_NAME> --description "<DESCRIPTION>" --vpc-id <TARGET_VPC_ID> --region <TARGET_REGION>',
            '',
            '# Add inbound rules (repeat for each rule)',
            'aws ec2 authorize-security-group-ingress --group-id <TARGET_SG_ID> --protocol tcp --port <PORT> --cidr <CIDR> --region <TARGET_REGION>',
            '',
            '# ── VALIDATE ──',
            'aws ec2 describe-security-groups --region <TARGET_REGION> --output json > sg-target-export.json'
          ],
          validation: ['Security groups created with correct names', 'Inbound/outbound rules match source', 'Self-referencing SG rules updated to target SG IDs'],
          rollback: 'Delete recreated security groups: aws ec2 delete-security-group --group-id <TARGET_SG_ID> --region <TARGET_REGION>'
        });
      }
      if (s.networkSecurity === 'nacls' || s.networkSecurity === 'both') {
        steps.push({
          title: 'Replicate NACLs to Target Region',
          owner: 'Customer', complexity: 'Medium',
          prereqs: ['Target subnets created', 'NACL rules documented from source region'],
          description: 'Capture all NACL configurations from the source region, recreate them in the target region with matching rules and rule numbers, and associate with the correct subnets.',
          commands: [
            '# ── CAPTURE ──',
            'aws ec2 describe-network-acls --region <SOURCE_REGION> --output json > nacl-source-export.json',
            '',
            '# ── RECREATE ──',
            'aws ec2 create-network-acl --vpc-id <TARGET_VPC_ID> --region <TARGET_REGION>',
            'aws ec2 create-network-acl-entry --network-acl-id <TARGET_NACL_ID> --rule-number <RULE_NUM> --protocol tcp --port-range From=<PORT>,To=<PORT> --cidr-block <CIDR> --rule-action allow --ingress --region <TARGET_REGION>',
            '',
            '# Associate NACL with subnets',
            'aws ec2 replace-network-acl-association --association-id <ASSOC_ID> --network-acl-id <TARGET_NACL_ID> --region <TARGET_REGION>'
          ],
          validation: ['NACLs created with correct rules', 'Subnet associations correct', 'Default deny rules in place'],
          rollback: 'Revert subnet associations to default NACL, then delete custom NACLs.'
        });
      }

      // ============================================================
      // PHASE: Topology-specific inter-region connectivity
      // Must come after VPC + SG/NACL, before data replication.
      // ============================================================
      if (s.networkTopology === 'multi-vpc-tgw') {
        steps.push({
          title: 'Configure Transit Gateway Peering in Target Region',
          owner: 'Customer', complexity: 'High',
          prereqs: ['Transit Gateway created in both regions', 'Route tables configured'],
          description: 'Establish Transit Gateway peering between source and target regions. Configure route propagation and attachment associations.',
          commands: [
            'aws ec2 create-transit-gateway-peering-attachment --transit-gateway-id <SOURCE_TGW> --peer-transit-gateway-id <TARGET_TGW> --peer-region <TARGET_REGION>',
            'aws ec2 accept-transit-gateway-peering-attachment --transit-gateway-attachment-id <ATTACHMENT_ID> --region <TARGET_REGION>',
            'aws ec2 create-transit-gateway-route --destination-cidr-block <TARGET_CIDR> --transit-gateway-route-table-id <RT_ID> --transit-gateway-attachment-id <ATTACHMENT_ID>'
          ],
          validation: ['TGW peering attachment active', 'Routes propagated', 'Cross-region connectivity verified'],
          rollback: 'Delete TGW peering attachment and routes.'
        });
      }
      if (s.networkTopology === 'hybrid') {
        steps.push({
          title: 'Configure Direct Connect Failover to Target Region',
          owner: 'Shared', complexity: 'High',
          prereqs: ['Direct Connect connection available', 'Virtual interfaces configured'],
          description: 'Set up Direct Connect failover path to target region. Configure BGP routing for automatic failover.',
          commands: [
            'aws directconnect describe-connections --output table',
            'aws directconnect create-private-virtual-interface --connection-id <DX_CONN_ID> --new-private-virtual-interface file://vif-config.json',
            'aws directconnect describe-virtual-interfaces --output table'
          ],
          validation: ['Direct Connect virtual interface active', 'BGP peering established', 'Failover routing tested'],
          rollback: 'Delete virtual interface and revert BGP configuration.'
        });
      }

      // ── GATE: Network Foundation Complete ──
      // All VPC, SG, NACL, connectivity, and topology steps must be validated
      // before proceeding to data replication and compute deployment.

      // Step: Parameter Group & Option Group Replication (for RDS/Aurora/Oracle/SQL Server)
      var dbs = s.dbTypes || [];
      var hasRdsDb = dbs.some(function (d) { return ['rds', 'aurora', 'rds-oracle', 'rds-sqlserver', 'rds-other', 'documentdb'].indexOf(d) >= 0; });
      if (hasRdsDb) {
        steps.push({
          title: 'Recreate Parameter Groups & Option Groups in Target Region',
          owner: 'Customer', complexity: 'Medium',
          prereqs: ['Target region enabled', 'DB engine versions confirmed'],
          description: 'RDS parameter groups and option groups are regional and cannot be copied across regions. Document your source parameter groups (custom settings), option groups (Oracle, SQL Server), and recreate them in the target region before restoring or creating databases. Default parameter groups may differ between regions — always use custom groups with documented settings.',
          refs: [
            { label: 'RDS Parameter Groups', url: 'https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithParamGroups.html' },
            { label: 'RDS Option Groups', url: 'https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithOptionGroups.html' }
          ],
          commands: [
            '# ── Document source parameter groups ──',
            'aws rds describe-db-parameter-groups --region <SOURCE_REGION> --output table',
            'aws rds describe-db-parameters --db-parameter-group-name <PARAM_GROUP> --region <SOURCE_REGION> \\',
            '  --query "Parameters[?Source==\'user\'].{Name:ParameterName,Value:ParameterValue}" --output table',
            '',
            '# ── Recreate parameter group in target region ──',
            'aws rds create-db-parameter-group --db-parameter-group-name <PARAM_GROUP> \\',
            '  --db-parameter-group-family <FAMILY> --description "Migrated from <SOURCE_REGION>" \\',
            '  --region <TARGET_REGION>',
            '',
            '# ── Apply custom parameter values ──',
            'aws rds modify-db-parameter-group --db-parameter-group-name <PARAM_GROUP> \\',
            '  --parameters "ParameterName=<NAME>,ParameterValue=<VALUE>,ApplyMethod=pending-reboot" \\',
            '  --region <TARGET_REGION>',
            '',
            '# ── Document and recreate option groups (Oracle, SQL Server) ──',
            'aws rds describe-option-groups --region <SOURCE_REGION> --output table',
            'aws rds create-option-group --option-group-name <OPT_GROUP> \\',
            '  --engine-name <ENGINE> --major-engine-version <VERSION> \\',
            '  --option-group-description "Migrated from <SOURCE_REGION>" \\',
            '  --region <TARGET_REGION>',
            '',
            '# ── For Aurora: cluster parameter groups ──',
            'aws rds describe-db-cluster-parameter-groups --region <SOURCE_REGION> --output table',
            'aws rds create-db-cluster-parameter-group --db-cluster-parameter-group-name <CLUSTER_PG> \\',
            '  --db-parameter-group-family <FAMILY> --description "Migrated from <SOURCE_REGION>" \\',
            '  --region <TARGET_REGION>'
          ],
          validation: ['Parameter groups recreated with matching custom values', 'Option groups recreated with matching options', 'Cluster parameter groups recreated (Aurora)', 'No default parameter group used for production databases'],
          rollback: 'Delete parameter groups and option groups in target region.'
        });
      }

      // Step: Data Replication — PER DB TYPE
      if (dbs.length > 0) {
        dbs.forEach(function (db) {
          var dbStep = RULES_ENGINE._getDbStep(db, s, arch);
          steps.push(dbStep);
        });
      }

      // Step: Data Handling (move/replicate/backup-restore)
      // S3-dependent commands are gated on sourceS3Availability
      var s3imp = s.sourceS3Availability === 'impaired';
      if (s.dataHandling === 'move') {
        var moveCmds = [];
        if (s3imp) {
          moveCmds.push('# ⚠ S3 IMPAIRED: aws s3 sync is NOT available while S3 is impaired in the source region.');
          moveCmds.push('# Use DMS for database migration. For object data, defer S3 sync until S3 is restored.');
          moveCmds.push('# Alternatives: use already-replicated data in target region, restore from existing cross-region backups,');
          moveCmds.push('# or use application-level exports if available.');
          moveCmds.push('');
        } else if (s.sourceS3Availability === 'unknown') {
          moveCmds.push('# ⚠ S3 status unknown — validate S3 availability via the AWS Health Dashboard before executing S3 commands.');
          moveCmds.push('');
          moveCmds.push('aws s3 sync s3://<SOURCE_BUCKET> s3://<TARGET_BUCKET> --region <TARGET_REGION>');
        } else {
          moveCmds.push('aws s3 sync s3://<SOURCE_BUCKET> s3://<TARGET_BUCKET> --region <TARGET_REGION>');
        }
        moveCmds.push('aws dms create-replication-task --replication-task-identifier <TASK_ID> --source-endpoint-arn <SRC_ARN> --target-endpoint-arn <TGT_ARN> --migration-type full-load --replication-instance-arn <INST_ARN>');
        steps.push({
          title: 'Execute Data Migration to Target Region',
          owner: 'Shared', complexity: 'High',
          prereqs: ['Target storage provisioned', 'Network connectivity verified', 'KMS keys available in target region'],
          description: 'One-time data migration using AWS DMS for databases and S3 sync for object storage. Validate data integrity after transfer. Include retry with exponential backoff in migration scripts to handle API throttling. AWS SDKs include built-in retry logic — configure max retries appropriately.' + (s3imp ? ' ⚠ S3 IMPAIRMENT: S3-dependent recovery actions are not available while S3 is impaired in the source region. S3 sync has been deferred. Use DMS or application-level data migration instead.' : ''),
          refs: [
            { label: 'Retry with backoff pattern', url: 'https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/retry-backoff.html' },
            { label: 'Storage migration guide (re:Post)', url: 'https://repost.aws/articles/ARS88PRFUwR4CYk2RqebZVzA' }
          ],
          commands: moveCmds,
          validation: s3imp ? ['Database row counts match', 'Data integrity checksums verified', 'S3 sync deferred — execute after S3 is restored'] : ['S3 object counts match', 'Database row counts match', 'Data integrity checksums verified'],
          rollback: 'Restore from source region backups.'
        });
      }
      if (s.dataHandling === 'replicate') {
        var replCmds = [];
        if (s3imp) {
          replCmds.push('# ⚠ S3 IMPAIRED: S3 replication commands are NOT available while S3 is impaired in the source region.');
          replCmds.push('# S3 cross-region replication has been deferred until S3 is restored.');
          replCmds.push('# RDS and DynamoDB replication below do NOT depend on S3 and can proceed.');
          replCmds.push('');
        } else if (s.sourceS3Availability === 'unknown') {
          replCmds.push('# ⚠ S3 status unknown — validate S3 availability via the AWS Health Dashboard before executing S3 commands.');
          replCmds.push('aws s3api put-bucket-replication --bucket <SOURCE_BUCKET> --replication-configuration file://replication.json');
        } else {
          replCmds.push('aws s3api put-bucket-replication --bucket <SOURCE_BUCKET> --replication-configuration file://replication.json');
        }
        replCmds.push('aws rds create-db-instance-read-replica --db-instance-identifier <REPLICA_ID> --source-db-instance-identifier <SOURCE_DB> --region <TARGET_REGION>');
        replCmds.push('aws dynamodb update-table --table-name <TABLE> --replica-updates "Create={RegionName=<TARGET_REGION>}"');
        steps.push({
          title: 'Configure Continuous Data Replication',
          owner: 'Shared', complexity: 'High',
          prereqs: ['Target storage provisioned', 'Replication IAM roles created', 'KMS keys available in target region'],
          description: 'Set up continuous cross-region replication for S3, RDS read replicas, and DynamoDB Global Tables. Monitor replication lag. Include retry with exponential backoff in automation scripts.' + (s3imp ? ' ⚠ S3 IMPAIRMENT: S3-dependent recovery actions are not available while S3 is impaired in the source region. S3 replication has been deferred. RDS and DynamoDB replication can proceed independently.' : ''),
          refs: [
            { label: 'Retry with backoff pattern', url: 'https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/retry-backoff.html' },
            { label: 'S3 Replication', url: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication.html' },
            { label: 'Database migration guide (re:Post)', url: 'https://repost.aws/articles/ARxnq1TlkJRQmu21ZYL3eggQ' }
          ],
          commands: replCmds,
          validation: s3imp ? ['RDS replica lag < threshold', 'DynamoDB replica in sync', 'S3 replication deferred — configure after S3 is restored'] : ['S3 replication status active', 'RDS replica lag < threshold', 'DynamoDB replica in sync'],
          rollback: 'Disable replication rules and delete replicas.'
        });
      }
      if (s.dataHandling === 'backup-restore') {
        steps.push({
          title: 'Configure Backup & Restore Strategy',
          owner: 'Customer', complexity: 'Medium',
          prereqs: ['AWS Backup vault created in target region', 'Backup IAM roles configured'],
          description: 'Set up AWS Backup plans for periodic cross-region backup copies. Test restore procedures in target region.' + (s.sourceS3Availability === 'impaired' ? ' ⚠ S3 IMPAIRMENT WARNING: Cross-region backup copy from the source region may fail if underlying snapshot data depends on S3. If copy fails, restore from recovery points already in the target region, or defer until S3 is restored.' : (s.sourceS3Availability === 'unknown' ? ' Note: Validate S3 availability in the source region before initiating cross-region backup copies — some backup types depend on S3.' : '')),
          refs: [
            { label: 'Storage migration guide (re:Post)', url: 'https://repost.aws/articles/ARS88PRFUwR4CYk2RqebZVzA' },
            { label: 'AWS Backup documentation', url: 'https://docs.aws.amazon.com/aws-backup/latest/devguide/whatisbackup.html' }
          ],
          commands: [
            'aws backup create-backup-vault --backup-vault-name DR-Vault --region <TARGET_REGION>',
            'aws backup create-backup-plan --backup-plan file://backup-plan.json --region <SOURCE_REGION>',
            'aws backup start-restore-job --recovery-point-arn <RECOVERY_POINT_ARN> --metadata file://restore-metadata.json --region <TARGET_REGION>'
          ],
          validation: ['Backup plan active', 'Cross-region copy successful', 'Test restore completed'],
          rollback: 'Delete backup vault and plan in target region.'
        });
      }

      // Step: App Deployment (app-type aware)
      var appStep = this._getAppDeployStep(s);
      steps.push(appStep);

      // Step: Application Integration Migration (SNS, SQS) — conditional on additionalServices
      // Must come BEFORE DNS and Monitoring — SNS topics are needed for monitoring alerts
      // Ref: https://repost.aws/articles/AR9O2IVNBHThmpKwi9GvEkAA
      var addSvc = s.additionalServices || [];
      if (addSvc.indexOf('sns-sqs') >= 0) {
      steps.push({
        title: 'Migrate Application Integration Services (SNS, SQS)',
        owner: 'Customer', complexity: 'Medium',
        prereqs: ['Target VPC and IAM roles configured', 'KMS keys available in target region'],
        description: 'SNS and SQS are regional — recreate topics, queues, subscriptions, and DLQ configs in the target region. Update application references to target-region ARNs. Use target-region KMS keys for encrypted queues/topics.',
        refs: [
          { label: 'Application Integration migration guide (re:Post)', url: 'https://repost.aws/articles/AR9O2IVNBHThmpKwi9GvEkAA' }
        ],
        commands: [
          '# ── Inventory SNS topics in source region ──',
          'aws sns list-topics --region <SOURCE_REGION> --output table',
          'aws sns get-topic-attributes --topic-arn <TOPIC_ARN> --region <SOURCE_REGION>',
          '',
          '# ── Recreate SNS topics in target region ──',
          'aws sns create-topic --name <TOPIC_NAME> --region <TARGET_REGION>',
          'aws sns subscribe --topic-arn arn:aws:sns:<TARGET_REGION>:<ACCOUNT_ID>:<TOPIC_NAME> --protocol <PROTOCOL> --notification-endpoint <ENDPOINT> --region <TARGET_REGION>',
          '',
          '# ── Inventory SQS queues in source region ──',
          'aws sqs list-queues --region <SOURCE_REGION> --output table',
          'aws sqs get-queue-attributes --queue-url <QUEUE_URL> --attribute-names All --region <SOURCE_REGION>',
          '',
          '# ── Recreate SQS queues in target region ──',
          'aws sqs create-queue --queue-name <QUEUE_NAME> --attributes file://queue-attributes.json --region <TARGET_REGION>',
          '',
          '# ── Recreate dead-letter queues first (if used) ──',
          'aws sqs create-queue --queue-name <DLQ_NAME> --region <TARGET_REGION>',
          '',
          '# ── Update application config to reference target-region ARNs ──'
        ],
        validation: ['SNS topics recreated with correct subscriptions', 'SQS queues recreated with matching attributes', 'Dead-letter queue configurations applied', 'Application references updated to target-region ARNs', 'Test message published and received'],
        rollback: 'Delete recreated SNS topics and SQS queues in target region.'
      });
      }

      // Step: WAF & Network Firewall Migration — conditional on additionalServices
      // Ref: https://repost.aws/articles/ARSGx1LTcRTQu7QUVNfXSOrQ
      if (addSvc.indexOf('waf') >= 0 || addSvc.indexOf('network-firewall') >= 0) {
      steps.push({
        title: 'Migrate WAF & Network Firewall',
        owner: 'Customer', complexity: 'Medium',
        prereqs: ['Target VPC created', 'ALB or API Gateway deployed in target region'],
        description: 'AWS WAF web ACLs and Network Firewall rule groups are regional — they must be recreated in the target region. Export existing WAF rules and Network Firewall configurations from the source region, then recreate and associate them with the corresponding resources in the target region.',
        refs: [
          { label: 'Networking migration guide (re:Post)', url: 'https://repost.aws/articles/ARSGx1LTcRTQu7QUVNfXSOrQ' },
          { label: 'AWS WAF documentation', url: 'https://docs.aws.amazon.com/waf/latest/developerguide/what-is-aws-waf.html' },
          { label: 'AWS Network Firewall documentation', url: 'https://docs.aws.amazon.com/network-firewall/latest/developerguide/what-is-aws-network-firewall.html' }
        ],
        commands: [
          '# ── Inventory WAF web ACLs in source region ──',
          'aws wafv2 list-web-acls --scope REGIONAL --region <SOURCE_REGION> --output table',
          '',
          '# ── Export WAF web ACL details ──',
          'aws wafv2 get-web-acl --name <WEB_ACL_NAME> --scope REGIONAL --id <WEB_ACL_ID> --region <SOURCE_REGION> --output json > waf-acl-export.json',
          '',
          '# ── Recreate WAF web ACL in target region ──',
          '# Review exported JSON, update any region-specific ARNs, then create:',
          'aws wafv2 create-web-acl --name <WEB_ACL_NAME> --scope REGIONAL --default-action Allow={} --rules file://waf-rules.json --visibility-config file://waf-visibility.json --region <TARGET_REGION>',
          '',
          '# ── Associate WAF with ALB in target region ──',
          'aws wafv2 associate-web-acl --web-acl-arn <TARGET_WEB_ACL_ARN> --resource-arn <TARGET_ALB_ARN> --region <TARGET_REGION>',
          '',
          '# ── Inventory Network Firewall rule groups (if used) ──',
          'aws network-firewall list-rule-groups --region <SOURCE_REGION> --output table',
          '',
          '# ── Export and recreate Network Firewall policy ──',
          'aws network-firewall describe-firewall-policy --firewall-policy-name <POLICY_NAME> --region <SOURCE_REGION> --output json > nfw-policy-export.json',
          '# Recreate in target region after reviewing exported config',
          'aws network-firewall create-firewall-policy --firewall-policy-name <POLICY_NAME> --firewall-policy file://nfw-policy.json --region <TARGET_REGION>',
          '',
          '# ── Create Network Firewall in target region ──',
          'aws network-firewall create-firewall --firewall-name <FW_NAME> --firewall-policy-arn <POLICY_ARN> --vpc-id <VPC_ID> --subnet-mappings SubnetId=<SUBNET_ID> --region <TARGET_REGION>'
        ],
        validation: ['WAF web ACL recreated with matching rules', 'WAF associated with target ALB/API Gateway', 'Network Firewall policy recreated (if used)', 'Network Firewall deployed and routing configured', 'Test traffic passes through WAF/firewall correctly'],
        rollback: 'Disassociate WAF from resources, delete web ACL. Delete Network Firewall and policy in target region.'
      });
      }

      // Step: Security Services Migration — conditional on additionalServices
      // Ref: https://repost.aws/articles/AROjnVwGlvRx2vESS9wrQEJQ
      if (addSvc.indexOf('cognito') >= 0 || addSvc.indexOf('guardduty') >= 0 || addSvc.indexOf('access-analyzer') >= 0) {
      steps.push({
        title: 'Migrate Security & Identity Services',
        owner: 'Customer', complexity: 'Medium',
        prereqs: ['Target region enabled', 'IAM roles configured'],
        description: 'Enable and configure GuardDuty, Cognito user pools, and IAM Access Analyzer in the target region. These services are regional and must be set up independently. For Cognito, user pools cannot be migrated — plan for user re-registration or use a custom migration Lambda trigger. GuardDuty detectors must be enabled per-region. IAM Access Analyzer must be created per-region to monitor resource policies.',
        refs: [
          { label: 'Security/Identity migration guide (re:Post)', url: 'https://repost.aws/articles/AROjnVwGlvRx2vESS9wrQEJQ' },
          { label: 'GuardDuty multi-account/region', url: 'https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_accounts.html' },
          { label: 'Cognito user pool migration', url: 'https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-import-using-lambda.html' },
          { label: 'IAM Access Analyzer', url: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/what-is-access-analyzer.html' }
        ],
        commands: [
          '# ── Enable GuardDuty in target region ──',
          'aws guardduty create-detector --enable --region <TARGET_REGION>',
          'aws guardduty list-detectors --region <TARGET_REGION>',
          '',
          '# ── Create IAM Access Analyzer in target region ──',
          'aws accessanalyzer create-analyzer --analyzer-name migration-analyzer --type ACCOUNT --region <TARGET_REGION>',
          'aws accessanalyzer list-analyzers --region <TARGET_REGION>',
          '',
          '# ── Cognito: inventory user pools in source region ──',
          'aws cognito-idp list-user-pools --max-results 20 --region <SOURCE_REGION> --output table',
          '',
          '# ── Cognito: recreate user pool in target region ──',
          '# Note: User pools cannot be directly migrated. Options:',
          '# 1. Create new pool + use USER_MIGRATION Lambda trigger for seamless migration',
          '# 2. Export users via CSV and import into new pool',
          '# 3. Use Cognito hosted UI with custom domain in target region',
          'aws cognito-idp create-user-pool --pool-name <POOL_NAME> --region <TARGET_REGION>',
          '',
          '# ── Verify ──',
          'aws guardduty get-detector --detector-id <DETECTOR_ID> --region <TARGET_REGION>',
          'aws accessanalyzer list-findings --analyzer-arn <ANALYZER_ARN> --region <TARGET_REGION>'
        ],
        validation: ['GuardDuty detector enabled in target region', 'IAM Access Analyzer created and scanning', 'Cognito user pool recreated (if applicable)', 'Cognito migration Lambda trigger configured (if using seamless migration)', 'Security findings baseline established'],
        rollback: 'Delete GuardDuty detector, Access Analyzer, and Cognito user pool in target region.'
      });
      }

      // Step: FSx Migration — conditional on additionalServices AND stateful data
      // Ref: https://repost.aws/articles/ARS88PRFUwR4CYk2RqebZVzA
      if (addSvc.indexOf('fsx') >= 0 && s.dataProfile && s.dataProfile.startsWith('stateful')) {
        steps.push({
          title: 'Migrate Amazon FSx File Systems',
          owner: 'Customer', complexity: 'Medium',
          prereqs: ['Target VPC and subnets created', 'KMS keys in target region', 'Active Directory configured (if FSx for Windows)'],
          description: 'FSx file systems are regional. Migration approach depends on file system type: FSx for Windows File Server supports AWS Backup cross-region copy; FSx for NetApp ONTAP supports SnapMirror replication; FSx for Lustre can be recreated from S3 data repository. Inventory existing file systems, plan the migration approach per type, and validate data integrity after restore.' + (s.sourceS3Availability === 'impaired' ? ' ⚠ S3 IMPAIRMENT: FSx for Lustre recreation from S3 data repository is not available while S3 is impaired. Use AWS Backup for FSx for Windows, or SnapMirror for ONTAP. Defer Lustre recreation until S3 is restored.' : ''),
          refs: [
            { label: 'Storage migration guide (re:Post)', url: 'https://repost.aws/articles/ARS88PRFUwR4CYk2RqebZVzA' },
            { label: 'FSx for Windows backup/restore', url: 'https://docs.aws.amazon.com/fsx/latest/WindowsGuide/using-backups.html' },
            { label: 'FSx for NetApp ONTAP', url: 'https://docs.aws.amazon.com/fsx/latest/ONTAPGuide/what-is-fsx-ontap.html' }
          ],
          commands: [
            '# ── Inventory FSx file systems in source region ──',
            'aws fsx describe-file-systems --region <SOURCE_REGION> --output table',
            '',
            '# ── FSx for Windows: use AWS Backup cross-region copy ──',
            'aws backup start-copy-job --source-backup-vault-name Default \\',
            '  --destination-backup-vault-arn arn:aws:backup:<TARGET_REGION>:<ACCOUNT_ID>:backup-vault:Default \\',
            '  --recovery-point-arn <RECOVERY_POINT_ARN> \\',
            '  --iam-role-arn arn:aws:iam::<ACCOUNT_ID>:role/AWSBackupRole --region <SOURCE_REGION>',
            '',
            '# ── Restore FSx from backup in target region ──',
            'aws backup start-restore-job --recovery-point-arn <TARGET_RECOVERY_POINT_ARN> \\',
            '  --metadata file://fsx-restore-metadata.json --iam-role-arn arn:aws:iam::<ACCOUNT_ID>:role/AWSBackupRole \\',
            '  --region <TARGET_REGION>',
            '',
            s.sourceS3Availability === 'impaired' ? '# ⚠ S3 IMPAIRED: FSx for Lustre recreation from S3 data repository is NOT available.' : '# ── FSx for Lustre: recreate from S3 data repository ──',
            s.sourceS3Availability === 'impaired' ? '# Defer Lustre recreation until S3 is restored in the source region.' : '# Ensure S3 data is replicated to target region first, then create new Lustre FS',
            s.sourceS3Availability !== 'impaired' ? 'aws fsx create-file-system --file-system-type LUSTRE \\' : '',
            s.sourceS3Availability !== 'impaired' ? '  --storage-capacity 1200 --subnet-ids <SUBNET_ID> \\' : '',
            s.sourceS3Availability !== 'impaired' ? '  --lustre-configuration ImportPath=s3://<TARGET_BUCKET> \\' : '',
            s.sourceS3Availability !== 'impaired' ? '  --region <TARGET_REGION>' : '',
            '',
            '# ── Verify ──',
            'aws fsx describe-file-systems --region <TARGET_REGION> --output table'
          ],
          validation: ['FSx file systems inventoried', 'Backup copy completed to target region (Windows)', 'File system restored/created in target region', 'Mount targets accessible from target VPC', 'Data integrity verified (file counts, checksums)'],
          rollback: 'Delete restored/created FSx file systems in target region.'
        });
      }

      // Step: DNS & Routing — architecture-aware per AWS DR Whitepaper
      // Ref: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy.html
      // Ref: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-failover-types.html
      // Ref: https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/disaster-recovery-options-in-the-cloud.html
      // AWS guidance per strategy:
      //   Backup/Restore: Simple routing → manual DNS update on failover
      //   Pilot Light: Failover routing (active-passive) with health checks
      //   Warm Standby: Failover routing OR weighted routing (small % to DR for testing)
      //   Active/Active: Latency-based, weighted, or geoproximity routing (all records active)
      var dnsDesc, dnsCmds, dnsValidation;

      if (arch === 'active-active') {
        dnsDesc = 'Configure Route 53 for active-active multi-region routing. Per AWS guidance, use latency-based routing so users are routed to the closest available region. Both regions serve production traffic simultaneously. Associate health checks with each record — Route 53 automatically stops routing to endpoints that fail health checks. Alternative: use AWS Global Accelerator with traffic dials for percentage-based routing.';
        dnsCmds = [
          '# ── Health checks for BOTH regions (always created in us-east-1) ──',
          'aws route53 create-health-check --caller-reference hc-region-a-$(date +%s) \\',
          '  --health-check-config Type=HTTPS,FullyQualifiedDomainName=<REGION_A_HOSTNAME>,Port=443,ResourcePath=/health,RequestInterval=30,FailureThreshold=3 \\',
          '  --region us-east-1',
          'aws route53 create-health-check --caller-reference hc-region-b-$(date +%s) \\',
          '  --health-check-config Type=HTTPS,FullyQualifiedDomainName=<REGION_B_HOSTNAME>,Port=443,ResourcePath=/health,RequestInterval=30,FailureThreshold=3 \\',
          '  --region us-east-1',
          '',
          '# ── Latency-based routing records — both regions active ──',
          '# Region A',
          'aws route53 change-resource-record-sets --hosted-zone-id <ZONE_ID> --change-batch \'{',
          '  "Changes":[{"Action":"UPSERT","ResourceRecordSet":{',
          '    "Name":"<HOSTNAME>","Type":"A","SetIdentifier":"region-a",',
          '    "Region":"<REGION_A>",',
          '    "AliasTarget":{"HostedZoneId":"<ALB_A_ZONE>","DNSName":"<ALB_A_DNS>","EvaluateTargetHealth":true},',
          '    "HealthCheckId":"<HC_A_ID>"',
          '  }}]}\'',
          '# Region B',
          'aws route53 change-resource-record-sets --hosted-zone-id <ZONE_ID> --change-batch \'{',
          '  "Changes":[{"Action":"UPSERT","ResourceRecordSet":{',
          '    "Name":"<HOSTNAME>","Type":"A","SetIdentifier":"region-b",',
          '    "Region":"<REGION_B>",',
          '    "AliasTarget":{"HostedZoneId":"<ALB_B_ZONE>","DNSName":"<ALB_B_DNS>","EvaluateTargetHealth":true},',
          '    "HealthCheckId":"<HC_B_ID>"',
          '  }}]}\'',
          '',
          '# ── Alternative: AWS Global Accelerator (AnyCast IP, no DNS caching issues) ──',
          '# aws globalaccelerator create-accelerator --name multi-region-app --ip-address-type IPV4',
          '# aws globalaccelerator create-endpoint-group --listener-arn <LISTENER_ARN> --endpoint-group-region <REGION> --endpoint-configurations EndpointId=<ALB_ARN>,Weight=128',
          '',
          '# ── Verify ──',
          'dig <HOSTNAME> +short',
          'dig <HOSTNAME> @8.8.8.8 +short'
        ];
        dnsValidation = ['Health checks Healthy for both regions', 'Latency records active for both regions', 'Traffic distributed — verify from different geographic locations', 'EvaluateTargetHealth enabled on alias records'];

      } else if (arch === 'warm-standby') {
        dnsDesc = 'Configure Route 53 for warm standby. AWS recommends failover routing (active-passive) as the primary approach. Optionally, use weighted routing to send a small percentage of traffic (e.g., 5-10%) to the DR region for continuous validation. The DR region is fully functional at reduced scale and can handle traffic immediately on failover. Consider ARC routing controls for data-plane-based failover.';
        dnsCmds = [
          '# ── Health checks (always in us-east-1) ──',
          'aws route53 create-health-check --caller-reference hc-primary-$(date +%s) \\',
          '  --health-check-config Type=HTTPS,FullyQualifiedDomainName=<PRIMARY_HOSTNAME>,Port=443,ResourcePath=/health,RequestInterval=30,FailureThreshold=3 \\',
          '  --region us-east-1',
          'aws route53 create-health-check --caller-reference hc-standby-$(date +%s) \\',
          '  --health-check-config Type=HTTPS,FullyQualifiedDomainName=<STANDBY_HOSTNAME>,Port=443,ResourcePath=/health,RequestInterval=30,FailureThreshold=3 \\',
          '  --region us-east-1',
          '',
          '# ── Lower TTL (do this days BEFORE cutover) ──',
          'aws route53 change-resource-record-sets --hosted-zone-id <ZONE_ID> --change-batch \'{"Changes":[{"Action":"UPSERT","ResourceRecordSet":{"Name":"<HOSTNAME>","Type":"A","TTL":60,"ResourceRecords":[{"Value":"<CURRENT_IP>"}]}}]}\'',
          '',
          '# ── Option A: Failover routing (recommended for DR) ──',
          'aws route53 change-resource-record-sets --hosted-zone-id <ZONE_ID> --change-batch \'{',
          '  "Changes":[{"Action":"UPSERT","ResourceRecordSet":{',
          '    "Name":"<HOSTNAME>","Type":"A","SetIdentifier":"primary",',
          '    "Failover":"PRIMARY",',
          '    "AliasTarget":{"HostedZoneId":"<PRIMARY_ALB_ZONE>","DNSName":"<PRIMARY_ALB_DNS>","EvaluateTargetHealth":true},',
          '    "HealthCheckId":"<PRIMARY_HC_ID>"',
          '  }}]}\'',
          'aws route53 change-resource-record-sets --hosted-zone-id <ZONE_ID> --change-batch \'{',
          '  "Changes":[{"Action":"UPSERT","ResourceRecordSet":{',
          '    "Name":"<HOSTNAME>","Type":"A","SetIdentifier":"secondary",',
          '    "Failover":"SECONDARY",',
          '    "AliasTarget":{"HostedZoneId":"<STANDBY_ALB_ZONE>","DNSName":"<STANDBY_ALB_DNS>","EvaluateTargetHealth":true}',
          '  }}]}\'',
          '',
          '# ── Option B: Weighted routing (send small % to DR for testing) ──',
          '# aws route53 change-resource-record-sets --hosted-zone-id <ZONE_ID> --change-batch \'{',
          '#   "Changes":[{"Action":"UPSERT","ResourceRecordSet":{',
          '#     "Name":"<HOSTNAME>","Type":"A","SetIdentifier":"primary","Weight":90,',
          '#     "AliasTarget":{"HostedZoneId":"<PRIMARY_ALB_ZONE>","DNSName":"<PRIMARY_ALB_DNS>","EvaluateTargetHealth":true},',
          '#     "HealthCheckId":"<PRIMARY_HC_ID>"',
          '#   }}]}\'',
          '# aws route53 change-resource-record-sets --hosted-zone-id <ZONE_ID> --change-batch \'{',
          '#   "Changes":[{"Action":"UPSERT","ResourceRecordSet":{',
          '#     "Name":"<HOSTNAME>","Type":"A","SetIdentifier":"standby","Weight":10,',
          '#     "AliasTarget":{"HostedZoneId":"<STANDBY_ALB_ZONE>","DNSName":"<STANDBY_ALB_DNS>","EvaluateTargetHealth":true},',
          '#     "HealthCheckId":"<STANDBY_HC_ID>"',
          '#   }}]}\'',
          '',
          '# ── Verify ──',
          'dig <HOSTNAME> +short',
          'aws route53 get-health-check-status --health-check-id <PRIMARY_HC_ID> --region us-east-1'
        ];
        dnsValidation = ['Health checks Healthy for both regions', 'Failover PRIMARY/SECONDARY records created', 'TTL lowered', 'Standby region responds when primary is unhealthy', 'Optional: weighted routing sends test traffic to standby'];

      } else if (arch === 'pilot-light') {
        dnsDesc = 'Configure Route 53 for pilot light active-passive failover. Create a PRIMARY failover record pointing to the source region and a SECONDARY record pointing to the target region. Route 53 routes all traffic to primary; on health check failure, traffic shifts to secondary. The secondary region has data replicated but compute must be scaled up on failover. Consider ARC routing controls for data-plane-based failover (more resilient during regional events).';
        dnsCmds = [
          '# ── Health check for primary (always in us-east-1) ──',
          'aws route53 create-health-check --caller-reference hc-primary-$(date +%s) \\',
          '  --health-check-config Type=HTTPS,FullyQualifiedDomainName=<PRIMARY_HOSTNAME>,Port=443,ResourcePath=/health,RequestInterval=30,FailureThreshold=3 \\',
          '  --region us-east-1',
          '',
          '# ── Lower TTL (do this days BEFORE cutover) ──',
          'aws route53 change-resource-record-sets --hosted-zone-id <ZONE_ID> --change-batch \'{"Changes":[{"Action":"UPSERT","ResourceRecordSet":{"Name":"<HOSTNAME>","Type":"A","TTL":60,"ResourceRecords":[{"Value":"<CURRENT_IP>"}]}}]}\'',
          '',
          '# ── Failover routing records ──',
          'aws route53 change-resource-record-sets --hosted-zone-id <ZONE_ID> --change-batch \'{',
          '  "Changes":[{"Action":"UPSERT","ResourceRecordSet":{',
          '    "Name":"<HOSTNAME>","Type":"A","SetIdentifier":"primary",',
          '    "Failover":"PRIMARY",',
          '    "AliasTarget":{"HostedZoneId":"<PRIMARY_ALB_ZONE>","DNSName":"<PRIMARY_ALB_DNS>","EvaluateTargetHealth":true},',
          '    "HealthCheckId":"<PRIMARY_HC_ID>"',
          '  }}]}\'',
          'aws route53 change-resource-record-sets --hosted-zone-id <ZONE_ID> --change-batch \'{',
          '  "Changes":[{"Action":"UPSERT","ResourceRecordSet":{',
          '    "Name":"<HOSTNAME>","Type":"A","SetIdentifier":"secondary",',
          '    "Failover":"SECONDARY",',
          '    "AliasTarget":{"HostedZoneId":"<TARGET_ALB_ZONE>","DNSName":"<TARGET_ALB_DNS>","EvaluateTargetHealth":true}',
          '  }}]}\'',
          '',
          '# ── Optional: ARC routing controls (data-plane failover) ──',
          '# See: https://docs.aws.amazon.com/r53recovery/latest/dg/what-is-route53-recovery.html',
          '',
          '# ── Verify ──',
          'dig <HOSTNAME> +short',
          'aws route53 get-health-check-status --health-check-id <PRIMARY_HC_ID> --region us-east-1'
        ];
        dnsValidation = ['Health check Healthy', 'Failover PRIMARY/SECONDARY records created', 'TTL lowered', 'Failover tested — secondary responds when primary is unhealthy'];

      } else {
        // Backup/Restore — simplest: manual DNS update on failover
        dnsDesc = 'For backup/restore, DNS is updated manually during failover since there is no running infrastructure in the DR region until recovery is complete. Lower TTLs in advance. When the target region is ready, update DNS to point to the new endpoint. Consider pre-creating failover records with the secondary pointing to a static "maintenance" page until recovery completes.';
        dnsCmds = [
          '# ── Lower TTL in advance (do this NOW, before any disaster) ──',
          'aws route53 change-resource-record-sets --hosted-zone-id <ZONE_ID> --change-batch \'{"Changes":[{"Action":"UPSERT","ResourceRecordSet":{"Name":"<HOSTNAME>","Type":"A","TTL":60,"ResourceRecords":[{"Value":"<CURRENT_IP>"}]}}]}\'',
          '',
          '# ── After recovery: update DNS to target region ──',
          'aws route53 change-resource-record-sets --hosted-zone-id <ZONE_ID> --change-batch \'{',
          '  "Changes":[{"Action":"UPSERT","ResourceRecordSet":{',
          '    "Name":"<HOSTNAME>","Type":"A",',
          '    "AliasTarget":{"HostedZoneId":"<TARGET_ALB_ZONE>","DNSName":"<TARGET_ALB_DNS>","EvaluateTargetHealth":true}',
          '  }}]}\'',
          '',
          '# ── Verify ──',
          'dig <HOSTNAME> +short',
          'dig <HOSTNAME> @8.8.8.8 +short',
          'curl -s -o /dev/null -w "%{http_code}" https://<HOSTNAME>/health'
        ];
        dnsValidation = ['TTL lowered in advance', 'DNS updated to target region after recovery', 'DNS resolves to target ALB', 'Application health check returns 200'];
      }

      steps.push({
        title: 'Configure DNS & Traffic Routing', owner: 'Shared', complexity: arch === 'active-active' ? 'High' : 'Medium',
        prereqs: ['App deployed and healthy in target region', 'Route 53 hosted zone access', 'ALB DNS names available', 'ACM certificates validated in target region'],
        description: dnsDesc,
        refs: [
          { label: 'Route 53 routing policies', url: 'https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy.html' },
          { label: 'Configuring DNS failover', url: 'https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-failover-configuring.html' },
          { label: 'Active-Active vs Active-Passive', url: 'https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-failover-types.html' },
          { label: 'Application Recovery Controller (ARC)', url: 'https://docs.aws.amazon.com/r53recovery/latest/dg/what-is-route53-recovery.html' },
          { label: 'Networking migration guide (re:Post)', url: 'https://repost.aws/articles/ARSGx1LTcRTQu7QUVNfXSOrQ' }
        ],
        commands: dnsCmds,
        validation: dnsValidation,
        rollback: 'Revert DNS records to point to source region. If using failover routing, delete failover records and create simple record.'
      });

      // Step: Monitoring — comprehensive per AWS Well-Architected
      // Ref: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/WhatIsCloudWatch.html
      steps.push({
        title: 'Set Up Monitoring, Logging & Alerting', owner: 'Customer', complexity: 'Medium',
        prereqs: ['App deployed', 'SNS topic for alerts', 'IAM roles for CloudWatch'],
        description: 'Recreate CloudWatch alarms, dashboards, and SNS topics in the target region. CloudWatch is regional — nothing carries over automatically. Also verify CloudTrail is logging API calls and set up cross-region observability if needed. Per AWS Well-Architected: monitoring is critical to detect issues during and after failover.',
        commands: [
          '# ── SNS topic for alerts ──',
          'aws sns create-topic --name migration-alerts --region <TARGET_REGION>',
          'aws sns subscribe --topic-arn arn:aws:sns:<TARGET_REGION>:<ACCOUNT_ID>:migration-alerts --protocol email --notification-endpoint <EMAIL> --region <TARGET_REGION>',
          '',
          '# ── CloudWatch alarms ──',
          'aws cloudwatch put-metric-alarm --alarm-name high-cpu --metric-name CPUUtilization --namespace AWS/EC2 --statistic Average --period 300 --threshold 80 --comparison-operator GreaterThanThreshold --evaluation-periods 2 --alarm-actions arn:aws:sns:<TARGET_REGION>:<ACCOUNT_ID>:migration-alerts --region <TARGET_REGION>',
          '',
          '# ── CloudWatch dashboard ──',
          'aws cloudwatch put-dashboard --dashboard-name DR-Overview --dashboard-body file://dashboard.json --region <TARGET_REGION>',
          '',
          '# ── Verify CloudTrail is active in target region ──',
          'aws cloudtrail get-trail-status --name <TRAIL_NAME> --region <TARGET_REGION>',
          '',
          '# ── Verify Config recorder ──',
          'aws configservice describe-configuration-recorder-status --region <TARGET_REGION>'
        ],
        validation: ['SNS topic created and subscription confirmed', 'Alarms in OK state', 'Dashboard shows metrics', 'CloudTrail logging active', 'Config recorder running'],
        rollback: 'Delete alarms, dashboards, SNS topics in target region.'
      });

      // Step: EBS Snapshot Copy (for EC2 workloads with data volumes)
      if (s.appType === 'ec2' || s.appType === 'mixed') {
        steps.push({
          title: 'Copy EBS Snapshots to Target Region',
          owner: 'Customer', complexity: 'Medium',
          prereqs: ['KMS keys in target region', 'Source EBS volumes identified'],
          description: 'Copy EBS snapshots for data volumes that are not part of AMIs. This covers persistent data volumes attached to EC2 instances (e.g., database data dirs, application state). Snapshots are copied encrypted using the target region KMS key.' + (s.sourceS3Availability === 'impaired' ? ' ⚠ S3 IMPAIRMENT WARNING: EBS snapshot copy operations depend on S3 in the source region. If S3 is impaired, snapshot copy may fail or be delayed. Consider alternative data transfer methods (e.g., rsync via jump server, application-level backup) until S3 is restored.' : ''),
          commands: [
            '# ── List EBS volumes in source region ──',
            'aws ec2 describe-volumes --region <SOURCE_REGION> \\',
            '  --query "Volumes[].{ID:VolumeId,Size:Size,AZ:AvailabilityZone,State:State}" --output table',
            '',
            '# ── Create snapshot of source volume ──',
            'aws ec2 create-snapshot --volume-id <VOLUME_ID> --description "DR copy" --region <SOURCE_REGION>',
            '',
            '# ── Copy snapshot to target region ──',
            'aws ec2 copy-snapshot --source-region <SOURCE_REGION> --source-snapshot-id <SNAP_ID> \\',
            '  --destination-region <TARGET_REGION> --kms-key-id <TARGET_KMS_KEY> \\',
            '  --description "DR copy from <SOURCE_REGION>" --encrypted --region <TARGET_REGION>',
            '',
            '# ── Create volume from snapshot in target region ──',
            'aws ec2 create-volume --snapshot-id <TARGET_SNAP_ID> --availability-zone <TARGET_REGION>a \\',
            '  --volume-type gp3 --encrypted --kms-key-id <TARGET_KMS_KEY> --region <TARGET_REGION>'
          ],
          validation: ['Snapshots copied to target region', 'Volumes created from snapshots', 'Data integrity verified'],
          rollback: 'Delete copied snapshots and volumes in target region.'
        });
      }

      // Step: Performance Acceleration Tips (for large data imports)
      if (s.dataProfile === 'stateful-large' && hasRdsDb) {
        steps.push({
          title: 'Performance Acceleration for Data Import',
          owner: 'Customer', complexity: 'Medium',
          prereqs: ['Target DB instances created', 'Data import in progress or planned'],
          description: 'For large data imports, temporarily increase storage performance to accelerate the process. After import and validation, revert to normal storage settings to control costs. These are optional optimizations — apply based on your import timeline requirements.',
          commands: [
            '# ── TEMPORARY IOPS ACCELERATION ──',
            '# Increase provisioned IOPS during import, revert after validation.',
            '',
            'aws rds modify-db-instance --db-instance-identifier <DB_ID> \\',
            '  --storage-type io2 --iops 10000 --apply-immediately --region <TARGET_REGION>',
            '',
            '# ── VOLUME HYDRATION / HOT TABLE WARMING ──',
            '# EBS volumes restored from snapshots load data lazily from S3.',
            '# First access to each block incurs higher latency.',
            '',
            '# Initialize (hydrate) restored EBS volumes by reading all blocks:',
            'sudo dd if=/dev/<DEVICE> of=/dev/null bs=1M',
            '# Or use fio:',
            'sudo fio --filename=/dev/<DEVICE> --rw=read --bs=1M --direct=1 --name=hydrate',
            '',
            '# Warm database buffer pool — run full table scan on critical tables:',
            '# PostgreSQL:',
            'psql -h <TARGET_ENDPOINT> -U <USER> -d <DATABASE> -c "SELECT count(*) FROM <TABLE>;"',
            '# MySQL:',
            'mysql -h <TARGET_ENDPOINT> -u <USER> -p -e "SELECT SQL_NO_CACHE count(*) FROM <TABLE>;" <DATABASE>',
            '',
            '# ── REVERT AFTER VALIDATION ──',
            '# After import is complete and validated, revert to cost-effective storage:',
            'aws rds modify-db-instance --db-instance-identifier <DB_ID> \\',
            '  --storage-type gp3 --iops 3000 --apply-immediately --region <TARGET_REGION>'
          ],
          validation: ['Import completed within target timeline', 'IOPS reverted to normal after validation', 'No performance degradation after storage revert'],
          rollback: 'Revert storage type and IOPS to original settings.'
        });
      }

      // Step: Resilience Hub Assessment (if not panic mode)
      if (!isPanic) {
        steps.push({
          title: 'Run AWS Resilience Hub Assessment',
          owner: 'Customer', complexity: 'Medium',
          prereqs: ['App deployed in target region', 'Resilience Hub access'],
          description: 'Use AWS Resilience Hub to assess the resilience posture of your application in the target region. Resilience Hub evaluates whether your deployed architecture meets your RTO/RPO targets and identifies gaps. Run this BEFORE cutover to catch issues. Resilience Hub can also detect configuration drift post-cutover.',
          commands: [
            '# ── Create Resilience Hub application ──',
            'aws resiliencehub create-app --name dr-assessment \\',
            '  --app-template-body file://app-template.json \\',
            '  --region <TARGET_REGION>',
            '',
            '# ── Import resources from CloudFormation stacks ──',
            'aws resiliencehub import-resources-to-draft-app-version \\',
            '  --app-arn <APP_ARN> \\',
            '  --source-arns arn:aws:cloudformation:<TARGET_REGION>:<ACCOUNT_ID>:stack/<STACK_NAME>/* \\',
            '  --region <TARGET_REGION>',
            '',
            '# ── Create resiliency policy matching your RTO/RPO targets ──',
            'aws resiliencehub create-resiliency-policy --policy-name dr-policy \\',
            '  --tier MissionCritical \\',
            '  --policy \'{"AZ":{"rpoInSecs":0,"rtoInSecs":0},"Hardware":{"rpoInSecs":0,"rtoInSecs":0},"Region":{"rpoInSecs":' + (s.rpo === 'near-zero' ? '60' : s.rpo === 'lt-15m' ? '900' : '3600') + ',"rtoInSecs":' + (s.recoveryRequirements === 'rto-lt-1h' ? '3600' : '86400') + '},"Software":{"rpoInSecs":0,"rtoInSecs":0}}\' \\',
            '  --region <TARGET_REGION>',
            '',
            '# ── Publish and run assessment ──',
            'aws resiliencehub publish-app-version --app-arn <APP_ARN> --region <TARGET_REGION>',
            'aws resiliencehub start-app-assessment --app-arn <APP_ARN> \\',
            '  --app-version published --assessment-name pre-cutover-check \\',
            '  --region <TARGET_REGION>',
            '',
            '# ── Check assessment results ──',
            'aws resiliencehub list-app-assessments --app-arn <APP_ARN> --region <TARGET_REGION>',
            'aws resiliencehub list-app-component-compliances --assessment-arn <ASSESSMENT_ARN> --region <TARGET_REGION>'
          ],
          validation: ['Resilience Hub app created', 'Assessment completed', 'RTO/RPO compliance status reviewed', 'Gaps identified and documented'],
          rollback: 'N/A — assessment only, no infrastructure changes.'
        });
      }

      // Step: Pre-Cutover Validation Gate
      // Ref: https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/rel_planning_for_recovery_dr_tested.html
      steps.push({
        title: isPanic ? 'URGENT: Pre-Cutover Validation' : 'Pre-Cutover Validation & DR Drill',
        owner: 'Shared', complexity: 'High',
        prereqs: ['All previous steps completed', 'Monitoring active', 'Rollback plan documented'],
        description: isPanic
          ? 'Perform minimal validation before emergency cutover. Verify critical application paths, data integrity, and DNS readiness. Document any gaps for post-incident review.'
          : 'Execute a DR drill to validate the entire recovery chain before production cutover. Per AWS Well-Architected REL13-BP03: "Regularly test failover to your recovery site to verify that it operates properly and that RTO and RPO are met." Test end-to-end application flow, data consistency, and failover routing. Document results.',
        commands: [
          '# ── Application health check ──',
          'curl -s -o /dev/null -w "%{http_code}" https://<TARGET_HOSTNAME>/health',
          '',
          '# ── Database connectivity test ──',
          '# Verify application can connect to databases in target region',
          '',
          '# ── Data integrity spot check ──',
          '# Compare sample records between source and target',
          '',
          '# ── DNS failover test (non-production) ──',
          'aws route53 get-health-check-status --health-check-id <HC_ID> --region us-east-1',
          '',
          '# ── Load test (if time permits) ──',
          '# Verify target region can handle expected traffic volume',
          '',
          '# ── Verify rollback procedure ──',
          '# Confirm you can revert DNS to source region within minutes'
        ],
        validation: [
          'Application health check returns 200',
          'Database queries return expected data',
          'Replication lag within RPO targets',
          isPanic ? 'Critical paths validated' : 'Full DR drill completed and documented',
          'Rollback procedure tested',
          'Stakeholders notified of cutover plan'
        ],
        rollback: 'If validation fails, do NOT proceed to cutover. Fix issues and re-validate.'
      });

      // Step: Cutover
      steps.push({
        title: isPanic ? 'URGENT: Execute Cutover' : 'Execute Cutover',
        owner: 'Shared', complexity: 'High',
        prereqs: isPanic ? ['Pre-cutover validation passed', 'Rollback plan ready'] : ['DR drill passed', 'Change management approved', 'Maintenance window scheduled', 'Stakeholders notified'],
        description: isPanic ? 'Execute immediate DNS cutover to target region. Monitor closely for 24 hours. Accept elevated risk due to reduced testing window.' : 'Execute production cutover during the approved maintenance window. Switch DNS to target region. Monitor for 48-72 hours before declaring success.',
        commands: [
          '# ⚠ SAFETY: Ensure rollback plan is ready before proceeding',
          '',
          '# ── Execute DNS cutover ──',
          'aws route53 change-resource-record-sets --hosted-zone-id <ZONE_ID> --change-batch \'{"Changes":[{"Action":"UPSERT","ResourceRecordSet":{"Name":"<HOSTNAME>","Type":"A","AliasTarget":{"HostedZoneId":"<ALB_ZONE_ID>","DNSName":"<TARGET_ALB_DNS>","EvaluateTargetHealth":true}}}]}\'',
          '',
          '# ── Verify DNS propagation ──',
          'dig <HOSTNAME> +short',
          'dig <HOSTNAME> @8.8.8.8 +short',
          'dig <HOSTNAME> @1.1.1.1 +short',
          '',
          '# ── Verify application health ──',
          'curl -s -o /dev/null -w "%{http_code}" https://<HOSTNAME>/health',
          '',
          '# ── Monitor error rates (last 5 minutes) ──',
          '# Note: date -d syntax is Linux-specific. On macOS, use: date -u -v-5M',
          'aws cloudwatch get-metric-statistics --namespace AWS/ApplicationELB --metric-name HTTPCode_Target_5XX_Count --dimensions Name=LoadBalancer,Value=<ALB_ID> --start-time $(date -u -d "5 min ago" +%Y-%m-%dT%H:%M:%S) --end-time $(date -u +%Y-%m-%dT%H:%M:%S) --period 60 --statistics Sum --region <TARGET_REGION>'
        ],
        validation: [
          'DNS resolves to target region',
          'All endpoints return 200',
          'No 5xx errors in ALB metrics',
          'No errors in application logs',
          isPanic ? 'Stable for 24 hours' : 'Stable for 48-72 hours',
          'Stakeholder sign-off obtained'
        ],
        rollback: 'Revert DNS to source region immediately. If using failover routing, disable the health check to force traffic back to primary.'
      });

      // Step: Post-Cutover Structured Validation Gate
      steps.push({
        title: isPanic ? 'URGENT: Post-Cutover Validation Gate' : 'Post-Cutover Structured Validation',
        owner: 'Shared', complexity: 'High',
        prereqs: ['Cutover completed', 'Application serving traffic from target region'],
        description: 'Structured validation to confirm data integrity, application health, and operational readiness before declaring migration successful. Do NOT decommission source region resources or finalize migration until all validation checks pass.',
        commands: [
          '# ── DATABASE VALIDATION ──',
          '',
          '# Row count comparison — run on BOTH source and target, compare results:',
          '',
          '# PostgreSQL:',
          'psql -h <ENDPOINT> -U <USER> -d <DATABASE> -c "SELECT schemaname, relname, n_live_tup FROM pg_stat_user_tables ORDER BY n_live_tup DESC;"',
          '',
          '# MySQL:',
          'mysql -h <ENDPOINT> -u <USER> -p -e "SELECT table_name, table_rows FROM information_schema.tables WHERE table_schema=\'<DATABASE>\';" <DATABASE>',
          '',
          '# Oracle (via sqlplus or SQL Developer):',
          '# SELECT table_name, num_rows FROM all_tables WHERE owner = \'<SCHEMA>\';',
          '',
          '# SQL Server (via sqlcmd):',
          'sqlcmd -S <ENDPOINT>,1433 -U <USER> -P <PASS> -d <DATABASE> -Q "SELECT t.name, p.rows FROM sys.tables t JOIN sys.partitions p ON t.object_id = p.object_id WHERE p.index_id IN (0,1)"',
          '',
          '# Schema object count comparison:',
          '# PostgreSQL:',
          'psql -h <ENDPOINT> -U <USER> -d <DATABASE> -c "SELECT CASE relkind WHEN \'r\' THEN \'table\' WHEN \'v\' THEN \'view\' WHEN \'i\' THEN \'index\' END AS type, count(*) FROM pg_class WHERE relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = \'public\') AND relkind IN (\'r\',\'v\',\'i\') GROUP BY relkind;"',
          '',
          '# ── APPLICATION VALIDATION ──',
          '',
          '# Health endpoint check:',
          'curl -s -o /dev/null -w "%{http_code}" https://<HOSTNAME>/health',
          '',
          '# Smoke test critical API endpoints:',
          'curl -s https://<HOSTNAME>/api/v1/<CRITICAL_ENDPOINT> | head -c 200',
          '',
          '# ── OPERATIONAL VALIDATION ──',
          '',
          '# Check application logs for errors:',
          '# Note: On macOS, replace date -d with: date -u -v-30M +%s',
          'aws logs filter-log-events --log-group-name <LOG_GROUP> \\',
          '  --filter-pattern "ERROR" --region <TARGET_REGION> \\',
          '  --start-time $(date -u -d "30 min ago" +%s)000',
          '',
          '# Check RDS/Aurora event logs:',
          'aws rds describe-events --source-type db-instance --region <TARGET_REGION> \\',
          '  --duration 60 --output table',
          '',
          '# Verify no alarms firing:',
          'aws cloudwatch describe-alarms --state-value ALARM --region <TARGET_REGION>'
        ],
        validation: [
          'Row counts match between source and target (within acceptable delta)',
          'Schema object counts match (tables, views, indexes, procedures)',
          'Application health endpoint returns 200',
          'Critical API endpoints respond correctly',
          'No ERROR entries in application logs',
          'No database error events',
          'No CloudWatch alarms firing',
          '⚠ Do NOT decommission source region until all checks pass'
        ],
        rollback: 'If validation fails, revert DNS to source region and investigate discrepancies.'
      });

      // Step: Post-Recovery Production Re-Protection
      if (!isPanic || s.workloadCriticality === 'tier-0' || s.workloadCriticality === 'tier-1') {
        steps.push({
          title: 'Post-Recovery: Re-Establish Production Protection',
          owner: 'Customer', complexity: 'Medium',
          prereqs: ['Post-cutover validation passed', 'Target region stable for 48+ hours'],
          description: 'Recovery is not complete for production workloads until secondary protection is re-established from the new primary. Re-create cross-region automated backups, read replicas, or Aurora Global Database from the new primary region. This step is critical for production workloads — skip only for non-production environments.',
          refs: [
            { label: 'RDS Automated Backups Replication', url: 'https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReplicateBackups.html' },
            { label: 'Aurora Global Database', url: 'https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-global-database.html' },
            { label: 'Well-Architected REL13-BP04', url: 'https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/rel_planning_for_recovery_dr_tested.html' }
          ],
          commands: [
            '# ── RE-ESTABLISH CROSS-REGION AUTOMATED BACKUPS ──',
            'aws rds start-db-instance-automated-backups-replication \\',
            '  --source-db-instance-arn arn:aws:rds:<TARGET_REGION>:<ACCOUNT_ID>:db:<DB_ID> \\',
            '  --backup-retention-period 7 \\',
            '  --kms-key-id <RECOVERY_REGION_KMS_KEY> --region <RECOVERY_REGION>',
            '',
            '# ── RE-ESTABLISH CROSS-REGION READ REPLICA ──',
            'aws rds create-db-instance-read-replica \\',
            '  --db-instance-identifier <DB_ID>-protection-replica \\',
            '  --source-db-instance-identifier arn:aws:rds:<TARGET_REGION>:<ACCOUNT_ID>:db:<DB_ID> \\',
            '  --db-instance-class <INSTANCE_CLASS> \\',
            '  --kms-key-id <RECOVERY_REGION_KMS_KEY> --region <RECOVERY_REGION>',
            '',
            '# ── RE-ESTABLISH AURORA GLOBAL DATABASE (if applicable) ──',
            'aws rds create-global-cluster --global-cluster-identifier protection-global \\',
            '  --source-db-cluster-identifier arn:aws:rds:<TARGET_REGION>:<ACCOUNT_ID>:cluster:<CLUSTER_ID>',
            'aws rds create-db-cluster --db-cluster-identifier protection-secondary \\',
            '  --global-cluster-identifier protection-global --engine aurora-mysql \\',
            '  --region <RECOVERY_REGION>',
            ''
          ].concat(
            (s.dbTypes && s.dbTypes.indexOf('s3') >= 0) ? (
              s.sourceS3Availability === 'impaired' ? [
                '# ── RE-ESTABLISH S3 CROSS-REGION REPLICATION (DEFERRED — S3 IMPAIRED) ──',
                '# ⚠ S3 is impaired in the source region. S3 replication cannot be configured now.',
                '# Re-run this step after S3 service is restored.',
                ''
              ] : [
                '# ── RE-ESTABLISH S3 CROSS-REGION REPLICATION ──',
                'aws s3api put-bucket-replication --bucket <TARGET_BUCKET> \\',
                '  --replication-configuration file://replication-config.json',
                ''
              ]
            ) : []
          ).concat([
            '# ── VERIFY PROTECTION STATUS ──',
            'aws rds describe-db-instance-automated-backups \\',
            '  --db-instance-identifier <DB_ID> --region <RECOVERY_REGION>'
          ]),
          validation: [
            'Cross-region automated backups replicating to recovery region',
            'Read replica (if applicable) available and replication lag acceptable',
            'Aurora Global Database (if applicable) secondary cluster available',
            'S3 replication (if applicable) active to recovery region',
            'Production workload is now protected against single-region failure'
          ],
          rollback: 'N/A — protection setup only. Remove replicas/backups if not needed.'
        });
      }

      // Step: Post-Cutover Stabilization & Failback Planning
      steps.push({
        title: 'Post-Cutover Stabilization & Failback Plan',
        owner: 'Customer', complexity: 'Medium',
        prereqs: ['Cutover completed', 'Monitoring active'],
        description: 'After successful cutover, stabilize the target region environment. Plan for failback to the original region when it becomes available (if applicable). Per AWS Well-Architected REL13-BP04: manage configuration drift at the DR site to ensure it stays in sync. Decommission source region resources only after full validation.',
        commands: [
          '# ── Verify ongoing health ──',
          'aws cloudwatch describe-alarms --state-value ALARM --region <TARGET_REGION>',
          '',
          '# ── Check replication status (if maintaining bi-directional) ──',
          '# Ensure data is flowing correctly in the new primary direction',
          '',
          '# ── Document lessons learned ──',
          '# Record actual RTO/RPO achieved vs targets',
          '# Document any issues encountered during cutover',
          '',
          '# ── Plan failback (when original region is available) ──',
          '# 1. Verify original region is healthy',
          '# 2. Set up reverse replication (target → original)',
          '# 3. Execute failback using same runbook in reverse',
          '',
          '# ── Decommission source region (only if permanent region exit) ──',
          '# ⚠ SAFETY: Do NOT decommission until fully validated',
          '# aws ec2 terminate-instances --instance-ids <IDS> --region <SOURCE_REGION>'
        ],
        validation: [
          'Target region stable for 48+ hours',
          'No alarms firing',
          'Failback plan documented',
          'Lessons learned recorded',
          'Configuration drift monitoring active'
        ],
        rollback: 'N/A — this is the stabilization phase. If issues arise, execute failback to source region.'
      });

      // ============================================================
      // NEW RECOVERY OPTIONS — conditional on wizard answers
      // Tasks 7.2–7.6: S3 copy, AWS Backup, EBS/RDS snapshot, cross-region copy
      // ============================================================

      // Task 7.2: Conditional S3 copy step
      var hasS3Data = (s.dbTypes && s.dbTypes.indexOf('s3') >= 0) || (s.dataProfile && s.dataProfile.startsWith('stateful'));
      if (hasS3Data && s.sourceS3Availability !== 'impaired') {
        steps.push({
          title: 'Copy S3 Data to Target Region',
          owner: 'Customer', complexity: 'Medium',
          prereqs: ['Target S3 buckets created', 'KMS keys available in target region', 'IAM roles with cross-region S3 access'],
          description: 'Copy S3 data from source to target region using aws s3 sync or aws s3 cp. For large datasets, consider S3 Batch Operations. ⚠ KMS: Verify KMS key availability in the destination region for SSE-KMS encrypted objects. For multi-region key support, see: https://docs.aws.amazon.com/kms/latest/developerguide/multi-region-keys-overview.html',
          refs: [
            { label: 'S3 sync documentation', url: 'https://docs.aws.amazon.com/cli/latest/reference/s3/sync.html' },
            { label: 'S3 Batch Operations', url: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/batch-ops.html' },
            { label: 'Multi-Region KMS keys', url: 'https://docs.aws.amazon.com/kms/latest/developerguide/multi-region-keys-overview.html' }
          ],
          commands: [
            '# ── Sync entire bucket to target region ──',
            'aws s3 sync s3://<SOURCE_BUCKET> s3://<TARGET_BUCKET> --source-region <SOURCE_REGION> --region <TARGET_REGION>',
            '',
            '# ── Copy specific prefix/folder ──',
            'aws s3 cp s3://<SOURCE_BUCKET>/<PREFIX>/ s3://<TARGET_BUCKET>/<PREFIX>/ --recursive --source-region <SOURCE_REGION> --region <TARGET_REGION>',
            '',
            '# ── For SSE-KMS encrypted objects, specify target KMS key ──',
            'aws s3 sync s3://<SOURCE_BUCKET> s3://<TARGET_BUCKET> --sse aws:kms --sse-kms-key-id <TARGET_KMS_KEY> --source-region <SOURCE_REGION> --region <TARGET_REGION>',
            '',
            '# ── Verify object counts match ──',
            'aws s3 ls s3://<SOURCE_BUCKET> --recursive --summarize | tail -2',
            'aws s3 ls s3://<TARGET_BUCKET> --recursive --summarize | tail -2'
          ],
          validation: ['Object counts match between source and target', 'Data integrity verified', 'SSE-KMS encryption confirmed in target region'],
          rollback: 'Delete copied objects in target bucket: aws s3 rm s3://<TARGET_BUCKET> --recursive'
        });
      }

      // Task 7.3: Conditional AWS Backup restore step
      if (s.backupTechnology === 'aws-backup') {
        steps.push({
          title: 'Restore from AWS Backup',
          owner: 'Customer', complexity: 'Medium',
          prereqs: ['AWS Backup vault in target region', 'Recovery points available', 'IAM roles for AWS Backup'],
          description: 'Restore resources from AWS Backup recovery points in the target region. Use cross-region backup copy if recovery points are not already in the target region. ⚠ KMS: Verify the encryption key used by the backup vault is accessible in the target region. For multi-region key support, see: https://docs.aws.amazon.com/kms/latest/developerguide/multi-region-keys-overview.html' + (s.sourceS3Availability === 'impaired' ? ' ⚠ S3 IMPAIRMENT WARNING: Cross-region backup copy from the source region may fail if underlying snapshot data depends on S3. If copy fails, restore from recovery points already in the target region, or defer until S3 is restored.' : ''),
          refs: [
            { label: 'AWS Backup restore documentation', url: 'https://docs.aws.amazon.com/aws-backup/latest/devguide/restoring-a-backup.html' },
            { label: 'Cross-region backup copy', url: 'https://docs.aws.amazon.com/aws-backup/latest/devguide/cross-region-backup.html' },
            { label: 'Multi-Region KMS keys', url: 'https://docs.aws.amazon.com/kms/latest/developerguide/multi-region-keys-overview.html' }
          ],
          commands: [
            '# ── List backup vaults in target region ──',
            'aws backup list-backup-vaults --region <TARGET_REGION> --output table',
            '',
            '# ── List recovery points ──',
            'aws backup list-recovery-points-by-backup-vault --backup-vault-name <VAULT_NAME> --region <TARGET_REGION> --output table',
            '',
            '# ── Copy recovery point cross-region (if needed) ──',
            'aws backup start-copy-job --source-backup-vault-name <SOURCE_VAULT> \\',
            '  --destination-backup-vault-arn arn:aws:backup:<TARGET_REGION>:<ACCOUNT_ID>:backup-vault:<TARGET_VAULT> \\',
            '  --recovery-point-arn <RECOVERY_POINT_ARN> \\',
            '  --iam-role-arn arn:aws:iam::<ACCOUNT_ID>:role/AWSBackupRole --region <SOURCE_REGION>',
            '',
            '# ── Start restore job ──',
            'aws backup start-restore-job --recovery-point-arn <RECOVERY_POINT_ARN> \\',
            '  --metadata file://restore-metadata.json \\',
            '  --iam-role-arn arn:aws:iam::<ACCOUNT_ID>:role/AWSBackupRole --region <TARGET_REGION>',
            '',
            '# ── Monitor restore job ──',
            'aws backup describe-restore-job --restore-job-id <RESTORE_JOB_ID> --region <TARGET_REGION>'
          ],
          validation: ['Recovery points available in target region', 'Restore job completed successfully', 'Restored resources accessible and functional'],
          rollback: 'Delete restored resources in target region if restore is incorrect.'
        });
      }

      // Task 7.4: Conditional EBS snapshot restore step
      if ((s.backupTechnology === 'native-snapshots' || s.appType === 'ec2') && s.sourceS3Availability !== 'impaired') {
        steps.push({
          title: 'Restore EBS Volumes from Snapshots',
          owner: 'Customer', complexity: 'Medium',
          prereqs: ['EBS snapshots available in target region', 'KMS keys in target region'],
          description: 'Create EBS volumes from snapshots in the target region. If snapshots are in the source region, copy them cross-region first. ⚠ KMS: Verify the KMS key is available in the target region. Encrypted snapshots require re-encryption with a target-region KMS key during cross-region copy. For multi-region key support, see: https://docs.aws.amazon.com/kms/latest/developerguide/multi-region-keys-overview.html',
          refs: [
            { label: 'EBS snapshot restore', url: 'https://docs.aws.amazon.com/ebs/latest/userguide/ebs-restoring-volume.html' },
            { label: 'Copy EBS snapshot cross-region', url: 'https://docs.aws.amazon.com/ebs/latest/userguide/ebs-copy-snapshot.html' },
            { label: 'Multi-Region KMS keys', url: 'https://docs.aws.amazon.com/kms/latest/developerguide/multi-region-keys-overview.html' }
          ],
          commands: [
            '# ── List available snapshots ──',
            'aws ec2 describe-snapshots --owner-ids self --region <SOURCE_REGION> --output table',
            '',
            '# ── Copy snapshot to target region (if needed) ──',
            'aws ec2 copy-snapshot --source-region <SOURCE_REGION> --source-snapshot-id <SNAP_ID> \\',
            '  --destination-region <TARGET_REGION> --kms-key-id <TARGET_KMS_KEY> \\',
            '  --encrypted --description "DR restore" --region <TARGET_REGION>',
            '',
            '# ── Create volume from snapshot ──',
            'aws ec2 create-volume --snapshot-id <TARGET_SNAP_ID> \\',
            '  --availability-zone <TARGET_REGION>a --volume-type gp3 \\',
            '  --encrypted --kms-key-id <TARGET_KMS_KEY> --region <TARGET_REGION>',
            '',
            '# ── Attach volume to instance ──',
            'aws ec2 attach-volume --volume-id <VOL_ID> --instance-id <INSTANCE_ID> --device /dev/sdf --region <TARGET_REGION>'
          ],
          validation: ['Snapshots copied to target region', 'Volumes created from snapshots', 'Volumes attached and accessible', 'Data integrity verified'],
          rollback: 'Detach and delete volumes, delete copied snapshots in target region.'
        });
      }

      // Task 7.5: Conditional RDS snapshot restore step
      var hasRds = s.dbTypes && (s.dbTypes.indexOf('rds') >= 0 || s.dbTypes.indexOf('aurora') >= 0);
      if ((s.backupTechnology === 'native-snapshots' || hasRds) && s.sourceS3Availability !== 'impaired') {
        steps.push({
          title: 'Restore RDS/Aurora from Snapshots',
          owner: 'Customer', complexity: 'Medium',
          prereqs: ['RDS snapshots available', 'DB subnet group in target region', 'KMS keys in target region', 'Parameter groups recreated in target region'],
          description: 'Restore RDS or Aurora database instances from snapshots in the target region. Copy snapshots cross-region if needed. ⚠ KMS: Cross-region snapshot restore requires re-encrypting with a KMS key available in the target region. For multi-region key support, see: https://docs.aws.amazon.com/kms/latest/developerguide/multi-region-keys-overview.html',
          refs: [
            { label: 'RDS snapshot restore', url: 'https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_RestoreFromSnapshot.html' },
            { label: 'Copy RDS snapshot cross-region', url: 'https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_CopySnapshot.html' },
            { label: 'Multi-Region KMS keys', url: 'https://docs.aws.amazon.com/kms/latest/developerguide/multi-region-keys-overview.html' }
          ],
          commands: [
            '# ── List available RDS snapshots ──',
            'aws rds describe-db-snapshots --db-instance-identifier <DB_ID> --region <SOURCE_REGION> --output table',
            '',
            '# ── Copy snapshot to target region (if needed) ──',
            'aws rds copy-db-snapshot --source-db-snapshot-identifier <SNAPSHOT_ARN> \\',
            '  --target-db-snapshot-identifier <DB_ID>-dr-copy \\',
            '  --kms-key-id <TARGET_KMS_KEY> --region <TARGET_REGION>',
            '',
            '# ── Restore DB instance from snapshot ──',
            'aws rds restore-db-instance-from-db-snapshot \\',
            '  --db-instance-identifier <DB_ID>-restored \\',
            '  --db-snapshot-identifier <DB_ID>-dr-copy \\',
            '  --db-subnet-group-name <SUBNET_GRP> \\',
            '  --db-instance-class <INSTANCE_CLASS> \\',
            '  --region <TARGET_REGION>',
            '',
            '# ── Verify restored instance ──',
            'aws rds describe-db-instances --db-instance-identifier <DB_ID>-restored --region <TARGET_REGION>'
          ],
          validation: ['Snapshot copied to target region', 'DB instance restored and available', 'Application connectivity verified', 'Data integrity confirmed'],
          rollback: 'Delete restored DB instance and copied snapshot in target region.'
        });
      }

      // Task 7.6: Conditional cross-region snapshot copy step
      // Only show when user explicitly selected native-snapshots AND has EBS or RDS resources
      var needsCrossRegionCopy = s.backupTechnology === 'native-snapshots' && (s.appType === 'ec2' || hasRds);
      if (needsCrossRegionCopy && s.sourceS3Availability !== 'impaired') {
        steps.push({
          title: 'Cross-Region Snapshot Copy',
          owner: 'Customer', complexity: 'Medium',
          prereqs: ['Source snapshots identified', 'KMS keys in target region'],
          description: 'Copy EBS and RDS snapshots from the source region to the target region for recovery. This is required when snapshots are not already replicated cross-region. ⚠ KMS: Re-encrypt with a KMS key in the target region during cross-region copy. For multi-region key support, see: https://docs.aws.amazon.com/kms/latest/developerguide/multi-region-keys-overview.html',
          refs: [
            { label: 'Copy EBS snapshot', url: 'https://docs.aws.amazon.com/ebs/latest/userguide/ebs-copy-snapshot.html' },
            { label: 'Copy RDS snapshot', url: 'https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_CopySnapshot.html' },
            { label: 'Multi-Region KMS keys', url: 'https://docs.aws.amazon.com/kms/latest/developerguide/multi-region-keys-overview.html' }
          ],
          commands: [
            '# ── Copy EBS snapshots cross-region ──',
            'aws ec2 copy-snapshot --source-region <SOURCE_REGION> --source-snapshot-id <SNAP_ID> \\',
            '  --destination-region <TARGET_REGION> --kms-key-id <TARGET_KMS_KEY> \\',
            '  --encrypted --description "Cross-region DR copy" --region <TARGET_REGION>',
            '',
            '# ── Copy RDS snapshots cross-region ──',
            'aws rds copy-db-snapshot --source-db-snapshot-identifier <SNAPSHOT_ARN> \\',
            '  --target-db-snapshot-identifier <DB_ID>-xregion-copy \\',
            '  --source-region <SOURCE_REGION> \\',
            '  --kms-key-id <TARGET_KMS_KEY> --region <TARGET_REGION>',
            '',
            '# ── Monitor copy progress ──',
            'aws ec2 describe-snapshots --snapshot-ids <TARGET_SNAP_ID> --region <TARGET_REGION> --query "Snapshots[].{Progress:Progress,State:State}"',
            'aws rds describe-db-snapshots --db-snapshot-identifier <DB_ID>-xregion-copy --region <TARGET_REGION> --query "DBSnapshots[].{Status:Status,PercentProgress:PercentProgress}"'
          ],
          validation: ['EBS snapshots copied and available in target region', 'RDS snapshots copied and available in target region', 'Encryption verified with target-region KMS key'],
          rollback: 'Delete copied snapshots in target region.'
        });
      }

      // ============================================================
      // Task 7.7: DMS Validation Guidance
      // Prepend DMS prerequisite notice to any step that mentions DMS
      // ============================================================
      var dmsWarning = '\u26a0 DMS Prerequisite: Before following DMS commands, verify that DMS replication instances exist by running `aws dms describe-replication-instances` or checking the Discovery Script output. If no DMS replication instances are found, DMS replication must be configured first. See: https://docs.aws.amazon.com/dms/latest/userguide/Welcome.html';
      for (var si = 0; si < steps.length; si++) {
        var step = steps[si];
        var hasDms = false;
        if (step.description && step.description.toLowerCase().indexOf('dms') >= 0) hasDms = true;
        if (!hasDms && step.commands) {
          for (var ci = 0; ci < step.commands.length; ci++) {
            if (step.commands[ci].toLowerCase().indexOf('dms') >= 0) { hasDms = true; break; }
          }
        }
        if (!hasDms && step.title && step.title.toLowerCase().indexOf('dms') >= 0) hasDms = true;
        if (hasDms) {
          step.description = dmsWarning + ' ' + step.description;
        }
      }

      return steps;
    },

    // Helper: per-DB-type runbook step — comprehensive per AWS docs
    // Ref: https://docs.aws.amazon.com/prescriptive-guidance/latest/strategy-database-disaster-recovery/choosing-database.html
    _getDbStep: function (db, s, arch) {
      var labels = { aurora: 'Aurora Global Database', rds: 'RDS Cross-Region Replica', dynamodb: 'DynamoDB Global Tables', documentdb: 'DocumentDB Global Cluster', elasticache: 'ElastiCache Global Datastore', s3: 'S3 Cross-Region Replication', 'rds-other': 'DMS Replication', 'rds-oracle': 'Oracle Migration', 'rds-sqlserver': 'SQL Server Migration', opensearch: 'OpenSearch Cross-Cluster Replication' };
      var cmds = [], desc = '', validation = [], prereqs = ['Target VPC and subnets created', 'KMS keys available in target region'];

      switch (db) {
        case 'aurora':
          var s3impAurora = s.sourceS3Availability === 'impaired';
          desc = 'Aurora Global Database: managed cross-region replication, typically sub-second lag. Create global cluster from primary, add secondary cluster + instances in target region. Monitor AuroraGlobalDBReplicationLag metric. On failover use managed failover or detach/promote.';
          if (s3impAurora) {
            desc += ' ⚠ S3 is impaired — Aurora snapshot copy is unavailable, but Aurora Global Database failover/detach remains available as it does not depend on S3.';
          }
          desc += ' Ref: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-global-database.html';
          prereqs.push('DB subnet group in target region', 'Source Aurora cluster identified');
          cmds = [
            '# ── Create global cluster from existing primary ──',
            'aws rds create-global-cluster --global-cluster-identifier migration-global \\',
            '  --source-db-cluster-identifier arn:aws:rds:<SOURCE_REGION>:<ACCOUNT_ID>:cluster:<CLUSTER_ID>',
            '',
            '# ── Add secondary cluster ──',
            'aws rds create-db-cluster --db-cluster-identifier migration-secondary \\',
            '  --global-cluster-identifier migration-global --engine aurora-mysql \\',
            '  --engine-version <VERSION> --db-subnet-group-name <SUBNET_GRP> \\',
            '  --kms-key-id <TARGET_KMS_KEY> --region <TARGET_REGION>',
            '',
            '# ── Add reader instance(s) ──',
            'aws rds create-db-instance --db-instance-identifier migration-secondary-1 \\',
            '  --db-cluster-identifier migration-secondary --engine aurora-mysql \\',
            '  --db-instance-class db.r6g.large --region <TARGET_REGION>',
            '',
            '# ── Monitor replication lag ──',
            '# Note: On macOS, replace date -d with: date -u -v-10M +%Y-%m-%dT%H:%M:%S',
            'aws cloudwatch get-metric-statistics --namespace AWS/RDS \\',
            '  --metric-name AuroraGlobalDBReplicationLag \\',
            '  --dimensions Name=DBClusterIdentifier,Value=migration-secondary \\',
            '  --period 60 --statistics Average --region <TARGET_REGION> \\',
            '  --start-time $(date -u -d "10 min ago" +%Y-%m-%dT%H:%M:%S) \\',
            '  --end-time $(date -u +%Y-%m-%dT%H:%M:%S)',
            '',
            '# ── Failover (when needed) ──',
            '# ⚠ SAFETY: promotes secondary, demotes primary',
            '# aws rds failover-global-cluster --global-cluster-identifier migration-global \\',
            '#   --target-db-cluster-identifier arn:aws:rds:<TARGET_REGION>:<ACCOUNT_ID>:cluster:migration-secondary'
          ];
          validation = ['Global cluster: available', 'Secondary cluster: available', 'Replication lag < 1s (AuroraGlobalDBReplicationLag)', 'Secondary readable (test SELECT)', 'KMS encryption active'];
          break;

        case 'rds':
          var s3okRds = s.sourceS3Availability === 'available';
          var s3impRds = s.sourceS3Availability === 'impaired';
          desc = 'RDS cross-region read replica (async). On failover, promote to standalone. Supported: MySQL, MariaDB, PostgreSQL, Oracle. Encrypted replicas need target-region KMS key.';
          if (s3impRds) {
            desc += ' ⚠ S3 is impaired — snapshot copy is unavailable. Read replica promotion remains available. Logical export (pg_dump, mysqldump, mydumper) also works without S3.';
          }
          desc += ' Ref: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReadRepl.html';
          prereqs.push('DB subnet group in target region', 'Parameter group recreated in target region', 'Engine supports cross-region replicas');
          cmds = [
            '# ── METHOD 1: Cross-Region Read Replica (preferred) ──',
            'aws rds create-db-instance-read-replica \\',
            '  --db-instance-identifier <DB_ID>-replica \\',
            '  --source-db-instance-identifier arn:aws:rds:<SOURCE_REGION>:<ACCOUNT_ID>:db:<DB_ID> \\',
            '  --db-instance-class <INSTANCE_CLASS> \\',
            '  --db-subnet-group-name <SUBNET_GRP> \\',
            '  --kms-key-id <TARGET_KMS_KEY> --region <TARGET_REGION>',
            '',
            '# Monitor replication lag',
            '# Note: On macOS, replace date -d with: date -u -v-10M +%Y-%m-%dT%H:%M:%S',
            'aws cloudwatch get-metric-statistics --namespace AWS/RDS \\',
            '  --metric-name ReplicaLag \\',
            '  --dimensions Name=DBInstanceIdentifier,Value=<DB_ID>-replica \\',
            '  --period 60 --statistics Average --region <TARGET_REGION> \\',
            '  --start-time $(date -u -d "10 min ago" +%Y-%m-%dT%H:%M:%S) \\',
            '  --end-time $(date -u +%Y-%m-%dT%H:%M:%S)',
            '',
            '# Promote on failover',
            '# ⚠ SAFETY: breaks replication permanently',
            '# aws rds promote-read-replica --db-instance-identifier <DB_ID>-replica --region <TARGET_REGION>',
            '',
            '# ── METHOD 2: PostgreSQL — pg_dump / pg_restore (works during S3 impairment) ──',
            '# Requires: jump server or bastion with psql/pg_dump/pg_restore installed,',
            '# network access to both source and target RDS endpoints.',
            '',
            '# Schema-only export (validate structure first):',
            'pg_dump -h <SOURCE_ENDPOINT> -U <USER> -d <DATABASE> --schema-only -Fc -f schema.dump',
            'pg_restore -h <TARGET_ENDPOINT> -U <USER> -d <DATABASE> --schema-only schema.dump',
            '',
            '# Full export (custom format, supports parallel restore):',
            'pg_dump -h <SOURCE_ENDPOINT> -U <USER> -d <DATABASE> -Fc -f full.dump',
            'pg_restore -h <TARGET_ENDPOINT> -U <USER> -d <DATABASE> -j <NUM_PARALLEL> full.dump',
            '',
            '# Plain SQL alternative (simpler, no parallel restore):',
            'pg_dump -h <SOURCE_ENDPOINT> -U <USER> -d <DATABASE> -Fp -f full.sql',
            'psql -h <TARGET_ENDPOINT> -U <USER> -d <DATABASE> -f full.sql',
            '',
            '# ── METHOD 3: MySQL/MariaDB — mysqldump (works during S3 impairment) ──',
            '# Requires: jump server with mysql client and mysqldump installed.',
            '',
            '# Single-transaction consistent export:',
            'mysqldump -h <SOURCE_ENDPOINT> -u <USER> -p --single-transaction \\',
            '  --routines --triggers --events <DATABASE> > dump.sql',
            'mysql -h <TARGET_ENDPOINT> -u <USER> -p <DATABASE> < dump.sql',
            '',
            '# For large datasets (>50 GB), use mydumper/myloader for parallelism:',
            'mydumper -h <SOURCE_ENDPOINT> -u <USER> -p <PASS> -B <DATABASE> \\',
            '  --threads 8 --compress --outputdir /tmp/mydumper-output',
            'myloader -h <TARGET_ENDPOINT> -u <USER> -p <PASS> -B <DATABASE> \\',
            '  --threads 8 --directory /tmp/mydumper-output',
            '',
            s3impRds ? '# ⚠ S3 IMPAIRED: Snapshot copy is NOT available. Use read replica or logical export above.' : ''
          ].filter(function (c) { return c !== ''; });
          validation = ['Replica: available OR logical import completed', 'ReplicaLag within RPO (if using replica)', 'Row counts match between source and target', 'Schema object counts match', 'Encryption matches source'];
          break;

        case 'dynamodb':
          desc = 'DynamoDB Global Tables: multi-region, multi-active. MREC mode uses last-writer-wins; MRSC provides strong consistency. Enable PITR on all replicas. Ref: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GlobalTables.html';
          prereqs = ['DynamoDB table in source region', 'No existing replica in target region'];
          cmds = [
            '# ── Enable PITR on source ──',
            'aws dynamodb update-continuous-backups --table-name <TABLE> \\',
            '  --point-in-time-recovery-specification PointInTimeRecoveryEnabled=true \\',
            '  --region <SOURCE_REGION>',
            '',
            '# ── Add replica ──',
            'aws dynamodb update-table --table-name <TABLE> \\',
            '  --replica-updates \'[{"Create":{"RegionName":"<TARGET_REGION>"}}]\' \\',
            '  --region <SOURCE_REGION>',
            '',
            '# ── Wait for ACTIVE ──',
            'aws dynamodb describe-table --table-name <TABLE> --region <TARGET_REGION> \\',
            '  --query "Table.TableStatus"',
            '',
            '# ── Enable PITR on replica ──',
            'aws dynamodb update-continuous-backups --table-name <TABLE> \\',
            '  --point-in-time-recovery-specification PointInTimeRecoveryEnabled=true \\',
            '  --region <TARGET_REGION>',
            '',
            '# ── Verify with test item ──',
            'aws dynamodb put-item --table-name <TABLE> --item \'{"pk":{"S":"dr-test"}}\' --region <SOURCE_REGION>',
            'aws dynamodb get-item --table-name <TABLE> --key \'{"pk":{"S":"dr-test"}}\' --region <TARGET_REGION>'
          ];
          validation = ['Replica: ACTIVE', 'PITR enabled both regions', 'Test item replicates', 'Capacity mode appropriate'];
          break;

        case 'documentdb':
          desc = 'DocumentDB Global Clusters: cross-region replication, RPO typically seconds. Not supported on v3.6 or t3/t4g/r4. Must create instances in secondary cluster after cluster creation. Ref: https://docs.aws.amazon.com/documentdb/latest/developerguide/global-clusters.html';
          prereqs.push('DB subnet group in target region', 'Engine v4.0+');
          cmds = [
            '# ── Create global cluster ──',
            'aws docdb create-global-cluster --global-cluster-identifier migration-docdb \\',
            '  --source-db-cluster-identifier arn:aws:rds:<SOURCE_REGION>:<ACCOUNT_ID>:cluster:<CLUSTER_ID>',
            '',
            '# ── Add secondary cluster ──',
            'aws docdb create-db-cluster --db-cluster-identifier migration-docdb-secondary \\',
            '  --global-cluster-identifier migration-docdb --engine docdb \\',
            '  --db-subnet-group-name <SUBNET_GRP> --region <TARGET_REGION>',
            '',
            '# ── Add instance to secondary ──',
            'aws docdb create-db-instance --db-instance-identifier migration-docdb-inst-1 \\',
            '  --db-cluster-identifier migration-docdb-secondary \\',
            '  --db-instance-class db.r6g.large --engine docdb --region <TARGET_REGION>',
            '',
            '# ── Failover ──',
            '# aws docdb switchover-global-cluster --global-cluster-identifier migration-docdb \\',
            '#   --target-db-cluster-identifier arn:aws:rds:<TARGET_REGION>:<ACCOUNT_ID>:cluster:migration-docdb-secondary'
          ];
          validation = ['Global cluster: available', 'Secondary cluster: available', 'Secondary instance: available', 'Replication lag acceptable'];
          break;

        case 'elasticache':
          desc = 'ElastiCache Global Datastore: cross-region replication for Redis/Valkey (node-based only, not serverless). Secondary is read-only. On failover, promote secondary. Ref: https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/Redis-Global-Datastore.html';
          prereqs.push('ElastiCache subnet group in target region', 'Node-based cluster (not serverless)');
          cmds = [
            '# ── Create global datastore ──',
            'aws elasticache create-global-replication-group \\',
            '  --global-replication-group-id-suffix migration-cache \\',
            '  --primary-replication-group-id <REPL_GROUP_ID> --region <SOURCE_REGION>',
            '',
            '# ── Add secondary ──',
            'aws elasticache create-replication-group \\',
            '  --replication-group-id migration-cache-secondary \\',
            '  --global-replication-group-id <GLOBAL_RG_ID> \\',
            '  --replication-group-description "DR replica" \\',
            '  --cache-subnet-group-name <CACHE_SUBNET_GRP> --region <TARGET_REGION>',
            '',
            '# ── Failover ──',
            '# aws elasticache failover-global-replication-group \\',
            '#   --global-replication-group-id <GLOBAL_RG_ID> \\',
            '#   --primary-region <TARGET_REGION> \\',
            '#   --primary-replication-group-id migration-cache-secondary'
          ];
          validation = ['Global datastore: available', 'Secondary: available', 'Read operations succeed on secondary'];
          break;

        case 's3':
          desc = 'S3 CRR: async replication of NEW objects. Requires versioning + IAM replication role. Use Batch Replication for existing objects. Consider RTC for SLA-backed 15-min replication. Ref: https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication.html';
          prereqs = ['Source bucket identified', 'IAM replication role created'];
          cmds = [
            '# ── Enable versioning ──',
            'aws s3api put-bucket-versioning --bucket <BUCKET> \\',
            '  --versioning-configuration Status=Enabled --region <SOURCE_REGION>',
            '',
            '# ── Create destination bucket ──',
            'aws s3api create-bucket --bucket <BUCKET>-replica --region <TARGET_REGION> \\',
            '  --create-bucket-configuration LocationConstraint=<TARGET_REGION>',
            'aws s3api put-bucket-versioning --bucket <BUCKET>-replica \\',
            '  --versioning-configuration Status=Enabled --region <TARGET_REGION>',
            '',
            '# ── Enable CRR (requires IAM role + replication-config.json) ──',
            '# Role needs: s3:GetReplicationConfiguration, s3:ListBucket (source)',
            '#   s3:ReplicateObject, s3:ReplicateDelete, s3:ReplicateTags (dest)',
            'aws s3api put-bucket-replication --bucket <BUCKET> \\',
            '  --replication-configuration file://replication-config.json',
            '',
            '# ── Replicate EXISTING objects (Batch Replication) ──',
            '# CRR only replicates new objects after rule creation',
            'aws s3control create-job --account-id <ACCOUNT_ID> \\',
            '  --operation \'{"S3ReplicateObject":{}}\' \\',
            '  --report \'{"Enabled":true,"Bucket":"arn:aws:s3:::<REPORT_BUCKET>","Format":"Report_CSV_20180820"}\' \\',
            '  --priority 1 --role-arn <BATCH_ROLE_ARN> --region <SOURCE_REGION> --no-confirmation-required',
            '',
            '# ── Verify ──',
            'aws s3api head-object --bucket <BUCKET>-replica --key <TEST_KEY> --region <TARGET_REGION>'
          ];
          validation = ['Versioning enabled both buckets', 'CRR rule active', 'Test object replicates', 'Existing objects replicated (Batch)', 'No replication failures'];
          break;

        case 'rds-other':
          desc = 'AWS DMS for engines without native cross-region replicas (SQL Server, etc). Requires replication instance, source/target endpoints, and replication task. Use full-load-and-cdc. For credentials, use Secrets Manager ARN instead of plaintext. Ref: https://docs.aws.amazon.com/dms/latest/userguide/Welcome.html';
          prereqs.push('DB subnet group in target region', 'Target DB instance created');
          cmds = [
            '# ── Create DMS replication instance ──',
            'aws dms create-replication-instance --replication-instance-identifier migration-dms \\',
            '  --replication-instance-class dms.r5.large \\',
            '  --replication-subnet-group-identifier <DMS_SUBNET_GRP> --region <TARGET_REGION>',
            '',
            '# ── Create endpoints ──',
            '# ⚠ SECURITY: Use --secrets-manager-access-role-arn and --secrets-manager-arn',
            '# instead of plaintext --username/--password in production.',
            'aws dms create-endpoint --endpoint-identifier src-ep --endpoint-type source \\',
            '  --engine-name sqlserver --server-name <SRC_HOST> --port 1433 \\',
            '  --username <USER> --password <PASS> --database-name <DB> --region <TARGET_REGION>',
            'aws dms create-endpoint --endpoint-identifier tgt-ep --endpoint-type target \\',
            '  --engine-name sqlserver --server-name <TGT_HOST> --port 1433 \\',
            '  --username <USER> --password <PASS> --database-name <DB> --region <TARGET_REGION>',
            '',
            '# ── Test connections ──',
            'aws dms test-connection --replication-instance-arn <DMS_ARN> --endpoint-arn <SRC_ARN> --region <TARGET_REGION>',
            'aws dms test-connection --replication-instance-arn <DMS_ARN> --endpoint-arn <TGT_ARN> --region <TARGET_REGION>',
            '',
            '# ── Create and start task ──',
            'aws dms create-replication-task --replication-task-identifier migration-task \\',
            '  --source-endpoint-arn <SRC_ARN> --target-endpoint-arn <TGT_ARN> \\',
            '  --replication-instance-arn <DMS_ARN> --migration-type full-load-and-cdc \\',
            '  --table-mappings file://table-mappings.json --region <TARGET_REGION>',
            'aws dms start-replication-task --replication-task-arn <TASK_ARN> \\',
            '  --start-replication-task-type start-replication --region <TARGET_REGION>'
          ];
          validation = ['DMS instance: available', 'Endpoint connections: successful', 'Task: running', 'CDC active (no errors)', 'Row counts match'];
          break;

        case 'rds-oracle':
          var s3ok = s.sourceS3Availability === 'available';
          var s3imp = s.sourceS3Availability === 'impaired';
          desc = 'Oracle on RDS: Cross-region read replica (Data Guard) is the preferred fast-path when available. ';
          if (s3imp) {
            desc += '⚠ S3 is impaired — snapshot copy and S3-based Data Pump export are unavailable. Use read replica promotion or logical export via DB link / jump server. ';
          }
          desc += 'Oracle supports cross-region read replicas via Data Guard (mounted or read-only mode). For logical migration, RDS Oracle supports DBMS_DATAPUMP procedures (not direct expdp/impdp CLI). Data Pump via DB link allows direct cross-region transfer without S3. Ref: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/oracle-read-replicas.html';
          prereqs.push('DB subnet group in target region', 'Parameter group recreated in target region', 'Option group recreated in target region');
          cmds = [
            '# ── METHOD 1: Cross-Region Read Replica (preferred fast-path) ──',
            '# Ref: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/oracle-read-replicas.html',
            'aws rds create-db-instance-read-replica \\',
            '  --db-instance-identifier <DB_ID>-oracle-replica \\',
            '  --source-db-instance-identifier arn:aws:rds:<SOURCE_REGION>:<ACCOUNT_ID>:db:<DB_ID> \\',
            '  --db-instance-class <INSTANCE_CLASS> \\',
            '  --db-subnet-group-name <SUBNET_GRP> \\',
            '  --kms-key-id <TARGET_KMS_KEY> --region <TARGET_REGION>',
            '',
            '# Monitor replication lag',
            '# Note: On macOS, replace date -d with: date -u -v-10M +%Y-%m-%dT%H:%M:%S',
            'aws cloudwatch get-metric-statistics --namespace AWS/RDS \\',
            '  --metric-name ReplicaLag \\',
            '  --dimensions Name=DBInstanceIdentifier,Value=<DB_ID>-oracle-replica \\',
            '  --period 60 --statistics Average --region <TARGET_REGION> \\',
            '  --start-time $(date -u -d "10 min ago" +%Y-%m-%dT%H:%M:%S) \\',
            '  --end-time $(date -u +%Y-%m-%dT%H:%M:%S)',
            '',
            '# Promote replica (breaks replication permanently)',
            '# aws rds promote-read-replica --db-instance-identifier <DB_ID>-oracle-replica --region <TARGET_REGION>',
            '',
            '# ── METHOD 2: Logical Export via DB Link (works during S3 impairment) ──',
            '# Uses DBMS_DATAPUMP on RDS Oracle — expdp/impdp CLI not available on RDS.',
            '# Requires: network connectivity between source and target RDS instances,',
            '# security groups allowing Oracle port (1521), DB link created on target.',
            '',
            '# Step 1: Create DB link on TARGET pointing to SOURCE (run via sqlplus):',
            'sqlplus <USER>/<PASS>@<TARGET_ENDPOINT>:1521/<SID> <<EOF',
            'CREATE DATABASE LINK source_link',
            '  CONNECT TO <USER> IDENTIFIED BY <PASS>',
            '  USING \'(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=<SOURCE_ENDPOINT>)(PORT=1521))(CONNECT_DATA=(SID=<SID>)))\';',
            'EOF',
            '',
            '# Step 2: Import via network link using DBMS_DATAPUMP (run via sqlplus):',
            'sqlplus <USER>/<PASS>@<TARGET_ENDPOINT>:1521/<SID> <<EOF',
            'DECLARE',
            '  h NUMBER;',
            'BEGIN',
            '  h := DBMS_DATAPUMP.OPEN(\'IMPORT\', \'SCHEMA\', NULL, NULL, \'COMPATIBLE\');',
            '  DBMS_DATAPUMP.ADD_FILE(h, \'import.log\', \'DATA_PUMP_DIR\', NULL, DBMS_DATAPUMP.KU\\$_FILE_TYPE_LOG_FILE);',
            '  DBMS_DATAPUMP.SET_PARAMETER(h, \'NETWORK_LINK\', \'SOURCE_LINK\');',
            '  DBMS_DATAPUMP.METADATA_FILTER(h, \'SCHEMA_EXPR\', \'IN (\'\'<SCHEMA>\'\')\');',
            '  DBMS_DATAPUMP.START_JOB(h);',
            'END;',
            '/',
            'EOF',
            '',
            s3ok ? '# ── METHOD 3: Data Pump via S3 staging (only when S3 is available) ──' : '',
            s3ok ? '# Ref: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Oracle.Procedural.Importing.DataPump.html' : '',
            s3ok ? '' : '',
            s3ok ? '# Export to S3 from source (run via sqlplus on source):' : '',
            s3ok ? 'sqlplus <USER>/<PASS>@<SOURCE_ENDPOINT>:1521/<SID> <<EOF' : '',
            s3ok ? 'SELECT rdsadmin.rdsadmin_s3_tasks.upload_to_s3(' : '',
            s3ok ? '  p_bucket_name => \'<BUCKET>\', p_prefix => \'oracle-export/\',' : '',
            s3ok ? '  p_s3_prefix => \'oracle-export/\', p_directory_name => \'DATA_PUMP_DIR\')' : '',
            s3ok ? '  AS TASK_ID FROM DUAL;' : '',
            s3ok ? 'EOF' : '',
            s3ok ? '# Then download from S3 to target and import using DBMS_DATAPUMP' : '',
            '',
            s3imp ? '# ⚠ S3 IMPAIRED: Snapshot copy and S3-based Data Pump are NOT available.' : '',
            s3imp ? '# Use Method 1 (read replica) or Method 2 (DB link) above.' : '',
            '',
            '# ── FALLBACK: AWS DMS (if read replica and logical export are not viable) ──',
            '# Create DMS replication instance, endpoints, test connections, then start task.',
            '# See the DMS Replication step for full workflow. Validate endpoint connectivity before starting.',
            'aws dms create-replication-instance --replication-instance-identifier oracle-dms \\',
            '  --replication-instance-class dms.r5.large --region <TARGET_REGION>'
          ].filter(function (c) { return c !== ''; });
          validation = ['Read replica available OR logical import completed', 'Replication lag within RPO (if using replica)', 'Row counts match between source and target', 'Schema object counts match', 'Application connectivity verified'];
          break;

        case 'rds-sqlserver':
          var s3okSql = s.sourceS3Availability === 'available';
          var s3impSql = s.sourceS3Availability === 'impaired';
          desc = 'SQL Server on RDS: Cross-region read replicas supported on Enterprise Edition (SQL Server 2016+). ';
          if (s3impSql) {
            desc += '⚠ S3 is impaired — native backup/restore via S3 and snapshot copy are unavailable. Use read replica promotion (Enterprise) or BCP table-level export. ';
          }
          desc += 'For non-Enterprise editions or when read replicas are not viable, use BCP for table-level export during S3 impairment, or native backup/restore via S3 when S3 is available. DMS is the fallback for all editions. Ref: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/SQLServer.ReadReplicas.html';
          prereqs.push('DB subnet group in target region', 'Parameter group recreated in target region');
          cmds = [
            '# ── METHOD 1: Cross-Region Read Replica (Enterprise Edition, SQL Server 2016+) ──',
            '# Ref: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/SQLServer.ReadReplicas.html',
            'aws rds create-db-instance-read-replica \\',
            '  --db-instance-identifier <DB_ID>-sqlserver-replica \\',
            '  --source-db-instance-identifier arn:aws:rds:<SOURCE_REGION>:<ACCOUNT_ID>:db:<DB_ID> \\',
            '  --db-instance-class <INSTANCE_CLASS> \\',
            '  --db-subnet-group-name <SUBNET_GRP> \\',
            '  --kms-key-id <TARGET_KMS_KEY> --region <TARGET_REGION>',
            '',
            '# Monitor replication lag',
            '# Note: On macOS, replace date -d with: date -u -v-10M +%Y-%m-%dT%H:%M:%S',
            'aws cloudwatch get-metric-statistics --namespace AWS/RDS \\',
            '  --metric-name ReplicaLag \\',
            '  --dimensions Name=DBInstanceIdentifier,Value=<DB_ID>-sqlserver-replica \\',
            '  --period 60 --statistics Average --region <TARGET_REGION> \\',
            '  --start-time $(date -u -d "10 min ago" +%Y-%m-%dT%H:%M:%S) \\',
            '  --end-time $(date -u +%Y-%m-%dT%H:%M:%S)',
            '',
            '# Promote replica (breaks replication permanently)',
            '# aws rds promote-read-replica --db-instance-identifier <DB_ID>-sqlserver-replica --region <TARGET_REGION>',
            '',
            '# ── METHOD 2: BCP Table-Level Export/Import (works during S3 impairment) ──',
            '# Requires: jump server / bastion with SQL Server tools, network access to both RDS instances.',
            '',
            '# Export from source (run on jump server):',
            'bcp <DATABASE>.<SCHEMA>.<TABLE> out <TABLE>.dat -S <SOURCE_ENDPOINT>,1433 -U <USER> -P <PASS> -n -b 10000',
            '',
            '# Import to target (run on jump server):',
            'bcp <DATABASE>.<SCHEMA>.<TABLE> in <TABLE>.dat -S <TARGET_ENDPOINT>,1433 -U <USER> -P <PASS> -n -b 10000',
            '',
            '# List all tables to script BCP for each:',
            'sqlcmd -S <SOURCE_ENDPOINT>,1433 -U <USER> -P <PASS> -d <DATABASE> \\',
            '  -Q "SELECT TABLE_SCHEMA + \'.\' + TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE=\'BASE TABLE\'"',
            '',
            s3okSql ? '# ── METHOD 3: Native Backup/Restore via S3 (only when S3 is available) ──' : '',
            s3okSql ? '# Ref: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/SQLServer.Procedural.Importing.html' : '',
            s3okSql ? '' : '',
            s3okSql ? '# Backup on source RDS SQL Server (run via sqlcmd):' : '',
            s3okSql ? 'sqlcmd -S <SOURCE_ENDPOINT>,1433 -U <USER> -P <PASS> -Q "exec msdb.dbo.rds_backup_database @source_db_name=\'<DATABASE>\', @s3_arn_to_backup_to=\'arn:aws:s3:::<BUCKET>/<DATABASE>.bak\', @type=\'FULL\';"' : '',
            s3okSql ? '' : '',
            s3okSql ? '# Monitor backup status:' : '',
            s3okSql ? 'sqlcmd -S <SOURCE_ENDPOINT>,1433 -U <USER> -P <PASS> -Q "exec msdb.dbo.rds_task_status @db_name=\'<DATABASE>\';"' : '',
            s3okSql ? '' : '',
            s3okSql ? '# Restore on target RDS SQL Server:' : '',
            s3okSql ? 'sqlcmd -S <TARGET_ENDPOINT>,1433 -U <USER> -P <PASS> -Q "exec msdb.dbo.rds_restore_database @restore_db_name=\'<DATABASE>\', @s3_arn_to_restore_from=\'arn:aws:s3:::<BUCKET>/<DATABASE>.bak\';"' : '',
            s3okSql ? '' : '',
            s3okSql ? '# Monitor restore status:' : '',
            s3okSql ? 'sqlcmd -S <TARGET_ENDPOINT>,1433 -U <USER> -P <PASS> -Q "exec msdb.dbo.rds_task_status @db_name=\'<DATABASE>\';"' : '',
            '',
            s3impSql ? '# ⚠ S3 IMPAIRED: Native backup/restore via S3 and snapshot copy are NOT available.' : '',
            s3impSql ? '# Use Method 1 (read replica, Enterprise only) or Method 2 (BCP) above.' : '',
            '',
            '# ── FALLBACK: AWS DMS (all editions, all scenarios) ──',
            '# Create DMS replication instance, endpoints, test connections, then start task.',
            '# See the DMS Replication step for full workflow. Validate endpoint connectivity before starting.',
            'aws dms create-replication-instance --replication-instance-identifier sqlserver-dms \\',
            '  --replication-instance-class dms.r5.large --region <TARGET_REGION>'
          ].filter(function (c) { return c !== ''; });
          validation = ['Read replica available OR BCP import completed OR native restore completed', 'Replication lag within RPO (if using replica)', 'Row counts match between source and target', 'Schema object counts match', 'Application connectivity verified'];
          break;

        case 'opensearch':
          desc = 'OpenSearch cross-cluster replication: replicate indexes across domains in different regions. Requires cross-cluster connection + replication rules via OpenSearch API. Ref: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/replication.html';
          prereqs.push('Target OpenSearch domain created', 'Cross-cluster connection authorized');
          cmds = [
            '# ── Create domain in target region ──',
            'aws opensearch create-domain --domain-name migration-search \\',
            '  --engine-version OpenSearch_2.11 \\',
            '  --cluster-config InstanceType=r6g.large.search,InstanceCount=2 \\',
            '  --ebs-options EBSEnabled=true,VolumeType=gp3,VolumeSize=100 \\',
            '  --encrypt-at-rest-options Enabled=true,KmsKeyId=<TARGET_KMS_KEY> \\',
            '  --node-to-node-encryption-options Enabled=true --region <TARGET_REGION>',
            '',
            '# ── Create cross-cluster connection ──',
            'aws opensearch create-outbound-connection \\',
            '  --local-domain-info \'{"AWSDomainInformation":{"DomainName":"<SRC_DOMAIN>","Region":"<SOURCE_REGION>","OwnerId":"<ACCOUNT_ID>"}}\' \\',
            '  --remote-domain-info \'{"AWSDomainInformation":{"DomainName":"migration-search","Region":"<TARGET_REGION>","OwnerId":"<ACCOUNT_ID>"}}\' \\',
            '  --connection-alias migration-repl --region <SOURCE_REGION>',
            '',
            '# ── Accept connection + configure replication via OpenSearch API ──',
            '# POST _plugins/_replication/<INDEX>/_start',
            '# { "leader_alias": "migration-repl", "leader_index": "<SOURCE_INDEX>" }'
          ];
          validation = ['Target domain: active', 'Connection: active', 'Replication rules configured', 'Index data replicating'];
          break;
      }

      var dbRefs = [
        { label: 'Database migration guide (re:Post)', url: 'https://repost.aws/articles/ARxnq1TlkJRQmu21ZYL3eggQ' }
      ];
      if (db === 'rds' || db === 'rds-other' || db === 'rds-oracle' || db === 'rds-sqlserver' || db === 'aurora' || db === 'documentdb') {
        dbRefs.push({ label: 'Logical database dump migration (re:Post)', url: 'https://repost.aws/articles/ARrCNNrVE8RymB8ETkheiOhw' });
      }
      if (db === 's3') {
        dbRefs = [{ label: 'Storage migration guide (re:Post)', url: 'https://repost.aws/articles/ARS88PRFUwR4CYk2RqebZVzA' }];
      }

      return {
        title: 'Data Replication — ' + (labels[db] || db),
        owner: 'Shared',
        complexity: (db === 'rds-other' || db === 'rds-oracle' || db === 'rds-sqlserver' || db === 'opensearch' || db === 'aurora') ? 'High' : 'Medium',
        prereqs: prereqs,
        description: desc,
        refs: dbRefs,
        commands: cmds,
        validation: validation,
        rollback: db === 'dynamodb' ? 'Remove replica: aws dynamodb update-table --table-name <TABLE> --replica-updates \'[{"Delete":{"RegionName":"<TARGET_REGION>"}}]\'' : db === 'aurora' ? 'Remove secondary: aws rds remove-from-global-cluster --global-cluster-identifier migration-global --db-cluster-identifier <SECONDARY_ARN>' : db === 's3' ? 'Delete replication rule and destination bucket.' : 'Delete replica/replication resources and clean up.'
      };
    },

    // Helper: app-type-aware deploy step
    _getAppDeployStep: function (s) {
      var t = s.appType || 'ec2';
      if (t === 'ec2') {
        return {
          title: 'Deploy EC2 / VM-based Application', owner: 'Customer', complexity: 'Medium',
          prereqs: ['AMIs copied to target region', 'IAM roles created', 'VPC configured'],
          description: 'Copy AMIs, launch instances or update Auto Scaling Groups, create Application Load Balancer, and configure target groups.',
          refs: [
            { label: 'Compute/Container migration guide (re:Post)', url: 'https://repost.aws/articles/ARmJojQYTRTLy4v3rsPZ0kQg' }
          ],
          commands: [
            'aws ec2 copy-image --source-image-id <AMI_ID> --source-region <SOURCE_REGION> --region <TARGET_REGION> --name "migrated-ami" --encrypted --kms-key-id <KEY_ID>',
            '',
            '# Create Application Load Balancer',
            'aws elbv2 create-load-balancer --name migration-alb --subnets <PUBLIC_SUBNET_A> <PUBLIC_SUBNET_B> --security-groups <ALB_SG_ID> --region <TARGET_REGION>',
            'aws elbv2 create-target-group --name migration-tg --protocol HTTP --port 80 --vpc-id <VPC_ID> --health-check-path /health --region <TARGET_REGION>',
            'aws elbv2 create-listener --load-balancer-arn <ALB_ARN> --protocol HTTPS --port 443 --certificates CertificateArn=<ACM_CERT_ARN> --default-actions Type=forward,TargetGroupArn=<TG_ARN> --region <TARGET_REGION>',
            '',
            '# Launch instances or create ASG',
            'aws ec2 run-instances --image-id <AMI_ID> --instance-type <INSTANCE_TYPE> --subnet-id <SUBNET_ID> --security-group-ids <SG_ID> --region <TARGET_REGION>',
            '# Or create ASG',
            'aws autoscaling create-auto-scaling-group --auto-scaling-group-name migration-asg --launch-template LaunchTemplateId=<LT_ID> --min-size 2 --max-size 10 --vpc-zone-identifier "<SUBNET_IDS>" --target-group-arns <TG_ARN> --region <TARGET_REGION>'
          ],
          validation: ['AMI available in target', 'Instances running and healthy', 'ALB active and listeners configured', 'Target group healthy', 'Health check endpoint returns 200'],
          rollback: 'Terminate instances, delete ASG, deregister AMIs.'
        };
      } else if (t === 'containers') {
        return {
          title: 'Deploy Container Services (ECS/EKS)', owner: 'Customer', complexity: 'Medium',
          prereqs: ['ECR images replicated', 'IAM roles created', 'VPC configured'],
          description: 'Set up ECR replication, create ECS cluster/services or EKS cluster, deploy task definitions.',
          refs: [
            { label: 'Compute/Container migration guide (re:Post)', url: 'https://repost.aws/articles/ARmJojQYTRTLy4v3rsPZ0kQg' }
          ],
          commands: ['# ECR replication', 'aws ecr put-replication-configuration --replication-configuration \'{"rules":[{"destinations":[{"region":"<TARGET_REGION>","registryId":"<ACCOUNT_ID>"}]}]}\' --region <SOURCE_REGION>', '# ECS cluster + service', 'aws ecs create-cluster --cluster-name migration-cluster --region <TARGET_REGION>', 'aws ecs create-service --cluster migration-cluster --service-name app-service --task-definition app-task:1 --desired-count 2 --launch-type FARGATE --network-configuration "awsvpcConfiguration={subnets=[<SUBNET_ID>],securityGroups=[<SG_ID>]}" --region <TARGET_REGION>', '# Verify', 'aws ecs describe-services --cluster migration-cluster --services app-service --region <TARGET_REGION>'],
          validation: ['ECR images available', 'ECS tasks running', 'Service desired=running count', 'ALB health checks passing'],
          rollback: 'Scale service to 0, delete service, delete cluster.'
        };
      } else if (t === 'serverless') {
        return {
          title: 'Deploy Serverless Application', owner: 'Customer', complexity: 'Low',
          prereqs: ['IaC templates ready (SAM/CDK/CloudFormation)', 'IAM roles created'],
          description: 'Deploy Lambda functions, API Gateway, and event sources via IaC. Serverless is inherently easier to replicate across regions.',
          refs: [
            { label: 'Compute/Container migration guide (re:Post)', url: 'https://repost.aws/articles/ARmJojQYTRTLy4v3rsPZ0kQg' }
          ],
          commands: ['# Deploy via SAM/CloudFormation', 'aws cloudformation deploy --template-file template.yaml --stack-name migration-serverless --region <TARGET_REGION> --capabilities CAPABILITY_IAM', '# Or SAM', 'sam deploy --template-file .aws-sam/build/template.yaml --stack-name migration-serverless --region <TARGET_REGION> --resolve-s3', '# Verify Lambda', 'aws lambda invoke --function-name <FUNCTION_NAME> --payload \'{"test":true}\' output.json --region <TARGET_REGION>'],
          validation: ['CloudFormation stack CREATE_COMPLETE', 'Lambda functions invocable', 'API Gateway endpoints responding', 'Event sources connected'],
          rollback: 'Delete CloudFormation stack.'
        };
      } else {
        return {
          title: 'Deploy Mixed / Multi-tier Application', owner: 'Customer', complexity: 'High',
          prereqs: ['All component types prepared (AMIs, ECR images, IaC templates)', 'IAM roles created', 'VPC configured'],
          description: 'Deploy each tier: EC2 for compute, containers for microservices, Lambda for event processing. Coordinate dependencies between tiers.',
          refs: [
            { label: 'Compute/Container migration guide (re:Post)', url: 'https://repost.aws/articles/ARmJojQYTRTLy4v3rsPZ0kQg' }
          ],
          commands: ['# Deploy each tier in dependency order:', '# 1. Shared infrastructure (VPC, ALB, SGs)', '# 2. Data tier (databases — already done)', '# 3. Backend services (ECS/EKS)', 'aws ecs create-service --cluster migration-cluster --service-name backend --task-definition backend:1 --desired-count 2 --launch-type FARGATE --region <TARGET_REGION>', '# 4. EC2 compute tier', 'aws ec2 run-instances --image-id <AMI_ID> --instance-type <TYPE> --subnet-id <SUBNET_ID> --region <TARGET_REGION>', '# 5. Serverless tier', 'aws cloudformation deploy --template-file serverless.yaml --stack-name migration-serverless --region <TARGET_REGION> --capabilities CAPABILITY_IAM'],
          validation: ['All tiers deployed', 'Inter-tier connectivity verified', 'End-to-end request flow works', 'Health checks passing on all tiers'],
          rollback: 'Tear down in reverse order: serverless, EC2, containers.'
        };
      }
    },

    // ============================================================
    // Accelerated Recovery — ControlMonkey Partner Card content
    // ============================================================
    getControlMonkeyCard: function () {
      return {
        title: 'IaC Rapid Capture — ControlMonkey (Partner Option)',
        description: 'During accelerated recovery, capturing and reproducing infrastructure quickly is critical. ControlMonkey is an AWS Partner (available on AWS Marketplace) that provides a Terraform automation platform for infrastructure governance and resilience. Verify current capabilities on their AWS Marketplace listing.',
        capabilities: [
          'Connects to AWS accounts and provides visibility across regions and services',
          'Helps visualize and manage infrastructure using IaC (Terraform/OpenTofu) workflows',
          'Provides drift detection and remediation capabilities',
          'Supports IaC posture management across multi-account environments'
        ],
        panicChecklist: [
          'Connect ControlMonkey to your AWS account(s)',
          'Import/generate IaC representation of existing infrastructure',
          'Use IaC pipeline to reproduce target region baseline rapidly',
          'Use as guardrails to prevent configuration drift during crisis recovery',
          'Validate target region matches source via drift comparison'
        ],
        sources: [
          { text: 'ControlMonkey Platform on AWS Marketplace', url: 'https://aws.amazon.com/marketplace/pp/prodview-3cuadcjyrgj4q' },
          { text: 'AWS Partner Network Blog — ControlMonkey for Large-scale AWS Governance', url: 'https://aws.amazon.com/blogs/apn/using-controlmonkeys-terraform-platform-to-govern-large-scale-aws-environments/' },
          { text: 'AWS Partner Network Blog — Strengthen Security Posture with IaC', url: 'https://aws.amazon.com/blogs/apn/strengthen-aws-security-posture-with-robust-infrastructure-as-code-strategy/' }
        ]
      };
    },

    // ============================================================
    // getCommandBlocks — Grouped CLI commands (DB-type aware)
    // ============================================================
    getCommandBlocks: function (s) {
      var blocks = [];
      blocks.push({ title: 'Region & Quotas', lang: 'bash', commands: '# Enable opt-in region\naws account get-region-opt-status --region-name <TARGET_REGION>\naws account enable-region --region-name <TARGET_REGION>\n\n# For Organization accounts (management account only):\n# aws account enable-region --region-name <TARGET_REGION> --account-id <MEMBER_ACCOUNT_ID>\n\n# Compare quotas using Service Quotas Replicator:\n# https://github.com/aws-samples/sample-service-quotas-replicator-for-aws\n\n# Manual quota comparison\naws service-quotas list-service-quotas --service-code ec2 --region <SOURCE_REGION> --output table\naws service-quotas list-service-quotas --service-code ec2 --region <TARGET_REGION> --output table\n\n# Request quota increases\naws service-quotas request-service-quota-increase \\\n  --service-code ec2 --quota-code L-1216C47A \\\n  --desired-value 100 --region <TARGET_REGION>\n\n# For urgent requests, open a support case:\n# aws support create-case --subject "Urgent: quota increase for region migration" \\\n#   --communication-body "Migrating from <SOURCE> to <TARGET>. Need quota parity." \\\n#   --service-code service-quotas --category-code other --severity-code urgent' });
      blocks.push({ title: 'KMS & Encryption', lang: 'bash', commands: 'aws kms create-key --description "Migration key" --region <TARGET_REGION>\naws kms create-alias --alias-name alias/migration-primary \\\n  --target-key-id <KEY_ID> --region <TARGET_REGION>' });
      blocks.push({ title: 'IAM & Security', lang: 'bash', commands: 'aws iam create-role --role-name MigrationAppRole \\\n  --assume-role-policy-document file://trust-policy.json\naws iam attach-role-policy --role-name MigrationAppRole \\\n  --policy-arn arn:aws:iam::<ACCOUNT_ID>:policy/AppPolicy\naws sts assume-role --role-arn arn:aws:iam::<ACCOUNT_ID>:role/MigrationAppRole \\\n  --role-session-name test\n\n# Configure regional STS endpoints for resilience\n# In ~/.aws/config add: sts_regional_endpoints = regional\n# Or: export AWS_STS_REGIONAL_ENDPOINTS=regional\naws sts get-caller-identity --region <TARGET_REGION>' });

      // Secrets, Parameters & Certificates
      blocks.push({ title: 'Secrets, Params & Certs', lang: 'bash', commands: '# Replicate Secrets Manager secret\naws secretsmanager replicate-secret-to-regions \\\n  --secret-id <SECRET_ID> \\\n  --add-replica-regions Region=<TARGET_REGION>\n\n# Recreate SSM parameters\naws ssm get-parameters-by-path --path "/" --recursive \\\n  --region <SOURCE_REGION> --output json > ssm-params.json\naws ssm put-parameter --name <PARAM_NAME> --value "<VALUE>" \\\n  --type SecureString --key-id <TARGET_KMS_KEY> --region <TARGET_REGION>\n\n# Request ACM certificate (cannot copy cross-region)\naws acm request-certificate --domain-name <DOMAIN> \\\n  --validation-method DNS --region <TARGET_REGION>' });

      // Networking
      var netCmds = '# Create VPC\naws ec2 create-vpc --cidr-block 10.1.0.0/16 --region <TARGET_REGION>\n\n# Internet Gateway\naws ec2 create-internet-gateway --region <TARGET_REGION>\naws ec2 attach-internet-gateway --internet-gateway-id <IGW_ID> \\\n  --vpc-id <VPC_ID> --region <TARGET_REGION>\n\n# Subnets (public + private)\naws ec2 create-subnet --vpc-id <VPC_ID> --cidr-block 10.1.1.0/24 \\\n  --availability-zone <TARGET_REGION>a --region <TARGET_REGION>\naws ec2 create-subnet --vpc-id <VPC_ID> --cidr-block 10.1.10.0/24 \\\n  --availability-zone <TARGET_REGION>a --region <TARGET_REGION>\n\n# NAT Gateway\naws ec2 allocate-address --domain vpc --region <TARGET_REGION>\naws ec2 create-nat-gateway --subnet-id <PUBLIC_SUBNET_ID> \\\n  --allocation-id <EIP_ALLOC_ID> --region <TARGET_REGION>\n\n# Route tables\naws ec2 create-route-table --vpc-id <VPC_ID> --region <TARGET_REGION>\naws ec2 create-route --route-table-id <RT_ID> \\\n  --destination-cidr-block 0.0.0.0/0 --gateway-id <IGW_ID> --region <TARGET_REGION>\n\n# DB subnet group\naws rds create-db-subnet-group --db-subnet-group-name migration-db-subnets \\\n  --db-subnet-group-description "DR subnets" \\\n  --subnet-ids <PRIVATE_SUBNET_A> <PRIVATE_SUBNET_B> --region <TARGET_REGION>\n\n# Security groups\naws ec2 create-security-group --group-name app-sg \\\n  --description "App SG" --vpc-id <VPC_ID> --region <TARGET_REGION>';
      blocks.push({ title: 'Networking', lang: 'bash', commands: netCmds });

      // Per-DB command blocks
      var dbs = s.dbTypes || [];
      dbs.forEach(function (db) {
        var step = RULES_ENGINE._getDbStep(db, s, RULES_ENGINE.getArchitecture(s));
        blocks.push({ title: 'Data — ' + step.title.replace('Data Replication — ', ''), lang: 'bash', commands: step.commands.join('\n') });
      });

      // App deployment
      var appStep = RULES_ENGINE._getAppDeployStep(s);
      blocks.push({ title: 'Application Deployment', lang: 'bash', commands: appStep.commands.join('\n') });

      blocks.push({ title: 'DNS & Routing', lang: 'bash', commands: '# ── Health checks (always us-east-1) ──\naws route53 create-health-check --caller-reference hc-$(date +%s) \\\n  --health-check-config Type=HTTPS,FullyQualifiedDomainName=<HOSTNAME>,Port=443,ResourcePath=/health,RequestInterval=30,FailureThreshold=3 \\\n  --region us-east-1\n\n# ── Lower TTL (do BEFORE cutover) ──\naws route53 change-resource-record-sets --hosted-zone-id <ZONE_ID> \\\n  --change-batch \'{"Changes":[{"Action":"UPSERT","ResourceRecordSet":{"Name":"<HOSTNAME>","Type":"A","TTL":60,"ResourceRecords":[{"Value":"<IP>"}]}}]}\'\n\n# ── Failover routing (active-passive) ──\n# PRIMARY record\naws route53 change-resource-record-sets --hosted-zone-id <ZONE_ID> \\\n  --change-batch \'{"Changes":[{"Action":"UPSERT","ResourceRecordSet":{"Name":"<HOSTNAME>","Type":"A","SetIdentifier":"primary","Failover":"PRIMARY","AliasTarget":{"HostedZoneId":"<ALB_ZONE>","DNSName":"<PRIMARY_ALB>","EvaluateTargetHealth":true},"HealthCheckId":"<HC_ID>"}}]}\'\n\n# SECONDARY record\naws route53 change-resource-record-sets --hosted-zone-id <ZONE_ID> \\\n  --change-batch \'{"Changes":[{"Action":"UPSERT","ResourceRecordSet":{"Name":"<HOSTNAME>","Type":"A","SetIdentifier":"secondary","Failover":"SECONDARY","AliasTarget":{"HostedZoneId":"<ALB_ZONE>","DNSName":"<TARGET_ALB>","EvaluateTargetHealth":true}}}]}\'\n\n# ── Verify ──\ndig <HOSTNAME> +short\naws route53 get-health-check-status --health-check-id <HC_ID> --region us-east-1' });
      blocks.push({ title: 'Monitoring', lang: 'bash', commands: 'aws sns create-topic --name migration-alerts --region <TARGET_REGION>\naws cloudwatch put-metric-alarm --alarm-name high-cpu \\\n  --metric-name CPUUtilization --namespace AWS/EC2 \\\n  --statistic Average --period 300 --threshold 80 \\\n  --comparison-operator GreaterThanThreshold --evaluation-periods 2 \\\n  --alarm-actions arn:aws:sns:<TARGET_REGION>:<ACCOUNT_ID>:migration-alerts \\\n  --region <TARGET_REGION>' });
      blocks.push({ title: 'App Integration (SNS/SQS)', lang: 'bash', commands: '# ── Inventory SNS topics ──\naws sns list-topics --region <SOURCE_REGION> --output table\n\n# ── Recreate SNS topics ──\naws sns create-topic --name <TOPIC_NAME> --region <TARGET_REGION>\naws sns subscribe --topic-arn arn:aws:sns:<TARGET_REGION>:<ACCOUNT_ID>:<TOPIC_NAME> \\\n  --protocol <PROTOCOL> --notification-endpoint <ENDPOINT> --region <TARGET_REGION>\n\n# ── Inventory SQS queues ──\naws sqs list-queues --region <SOURCE_REGION> --output table\n\n# ── Recreate SQS queues ──\naws sqs create-queue --queue-name <QUEUE_NAME> \\\n  --attributes file://queue-attributes.json --region <TARGET_REGION>' });
      blocks.push({ title: 'Cutover Validation', lang: 'bash', commands: 'dig <HOSTNAME> +short\ndig <HOSTNAME> @8.8.8.8 +short\ncurl -s -o /dev/null -w "%{http_code} %{time_total}s\\n" https://<HOSTNAME>/health\n\n# Note: date -d syntax is Linux-specific. On macOS, use: date -u -v-5M +%Y-%m-%dT%H:%M:%S\naws cloudwatch get-metric-statistics --namespace AWS/ApplicationELB \\\n  --metric-name HTTPCode_Target_2XX_Count \\\n  --dimensions Name=LoadBalancer,Value=<ALB_ID> \\\n  --start-time $(date -u -d "5 min ago" +%Y-%m-%dT%H:%M:%S) \\\n  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \\\n  --period 60 --statistics Sum --region <TARGET_REGION>' });
      return blocks;
    },

    // ============================================================
    // getReferenceLibrary
    // ============================================================
    // Reference Library — all links verified via MCP against official AWS docs (March 2026)
    getReferenceLibrary: function () {
      return [
        { title: 'Control Plane vs Data Plane', content: '<ul><li><strong>Control plane</strong> manages resources (create/update/delete). Regional, may be unavailable during events.</li><li><strong>Data plane</strong> uses resources (read/write). Higher availability design goals.</li><li>Design failover to use data plane operations only — pre-provision all resources.</li></ul><p style="margin-top:8px"><a href="https://docs.aws.amazon.com/whitepapers/latest/aws-fault-isolation-boundaries/control-planes-and-data-planes.html" target="_blank" rel="noopener">AWS Docs: Control Planes and Data Planes</a></p>' },
        { title: 'DR Strategies (Backup/Restore → Active/Active)', content: '<ul><li><strong>Backup/Restore:</strong> Lowest cost, highest RTO (hours). Snapshots + IaC redeploy.</li><li><strong>Pilot Light:</strong> Data layer live, compute off. RTO: 10s of minutes.</li><li><strong>Warm Standby:</strong> Scaled-down but functional. RTO: minutes.</li><li><strong>Active/Active:</strong> Full production in both regions. RTO: near zero.</li></ul><p style="margin-top:8px"><a href="https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/disaster-recovery-options-in-the-cloud.html" target="_blank" rel="noopener">AWS Whitepaper: DR Options in the Cloud</a> | <a href="https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/plan-for-disaster-recovery-dr.html" target="_blank" rel="noopener">Well-Architected: Plan for DR</a></p>' },
        { title: 'Region Enablement & Service Quotas', content: '<ul><li>Opt-in regions (launched after March 2019) must be explicitly enabled via <code>aws account enable-region</code>.</li><li>Default regions are always enabled and cannot be disabled.</li><li>Not all services are available in all regions — check regional availability.</li><li>Service quotas are per-region — request increases in the target region early.</li></ul><p style="margin-top:8px"><a href="https://docs.aws.amazon.com/accounts/latest/reference/manage-acct-regions.html" target="_blank" rel="noopener">AWS Docs: Managing Regions</a> | <a href="https://docs.aws.amazon.com/general/latest/gr/aws_service_limits.html" target="_blank" rel="noopener">Service Quotas</a></p>' },
        { title: 'KMS Key Management', content: '<ul><li>KMS keys are regional — cannot be moved or copied across regions.</li><li>Create equivalent keys in the target region before copying encrypted resources.</li><li>Multi-Region keys available for some use cases.</li></ul><p style="margin-top:8px"><a href="https://docs.aws.amazon.com/kms/latest/developerguide/overview.html" target="_blank" rel="noopener">AWS Docs: KMS Overview</a> | <a href="https://docs.aws.amazon.com/kms/latest/developerguide/multi-region-keys-overview.html" target="_blank" rel="noopener">Multi-Region Keys</a></p>' },
        { title: 'IAM & Security', content: '<ul><li>IAM is a global service — roles and policies exist across all regions.</li><li>Resource-based policies may reference region-specific ARNs (S3, KMS).</li><li>STS regional endpoints provide better resilience than the global endpoint.</li></ul><p style="margin-top:8px"><a href="https://docs.aws.amazon.com/IAM/latest/UserGuide/introduction.html" target="_blank" rel="noopener">AWS Docs: IAM</a> | <a href="https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_temp_region-endpoints.html" target="_blank" rel="noopener">STS Regional Endpoints</a></p>' },
        { title: 'Database Replication Patterns', content: '<ul><li><strong>Aurora:</strong> Global Database — typically sub-second replication lag. <a href="https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-global-database.html" target="_blank" rel="noopener">Docs</a></li><li><strong>RDS:</strong> Cross-region read replicas (async). <a href="https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReadRepl.html" target="_blank" rel="noopener">Docs</a></li><li><strong>DynamoDB:</strong> Global Tables — multi-active. <a href="https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GlobalTables.html" target="_blank" rel="noopener">Docs</a></li><li><strong>DocumentDB:</strong> Global Clusters. <a href="https://docs.aws.amazon.com/documentdb/latest/developerguide/global-clusters.html" target="_blank" rel="noopener">Docs</a></li><li><strong>ElastiCache:</strong> Global Datastore (Redis/Valkey). <a href="https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/Redis-Global-Datastore.html" target="_blank" rel="noopener">Docs</a></li><li><strong>OpenSearch:</strong> Cross-cluster replication. <a href="https://docs.aws.amazon.com/opensearch-service/latest/developerguide/replication.html" target="_blank" rel="noopener">Docs</a></li></ul><p style="margin-top:8px;font-size:12px;color:var(--ts)">⚠ All replication is asynchronous. Actual RPO depends on lag at time of failure.</p>' },
        { title: 'S3 Replication', content: '<ul><li><strong>CRR:</strong> Async replication of new objects to another region. Requires versioning.</li><li>Use S3 Batch Replication for existing objects.</li><li><strong>Replication Time Control:</strong> SLA-backed replication within 15 minutes.</li><li><strong>Multi-Region Access Points:</strong> Global endpoint with automatic failover.</li></ul><p style="margin-top:8px"><a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication.html" target="_blank" rel="noopener">AWS Docs: S3 Replication</a> | <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/MultiRegionAccessPoints.html" target="_blank" rel="noopener">Multi-Region Access Points</a></p>' },
        { title: 'Networking (VPC, TGW, DX)', content: '<ul><li>VPCs are regional — recreate with non-overlapping CIDRs.</li><li>TGW supports inter-region peering.</li><li>Direct Connect: weeks to months lead time.</li><li>Security groups and NACLs must be recreated.</li></ul><p style="margin-top:8px"><a href="https://docs.aws.amazon.com/vpc/latest/userguide/what-is-amazon-vpc.html" target="_blank" rel="noopener">AWS Docs: VPC</a> | <a href="https://docs.aws.amazon.com/vpc/latest/tgw/tgw-peering.html" target="_blank" rel="noopener">TGW Peering</a> | <a href="https://docs.aws.amazon.com/directconnect/latest/UserGuide/Welcome.html" target="_blank" rel="noopener">Direct Connect</a></p>' },
        { title: 'DNS & Route 53', content: '<ul><li>Route 53 is a global service — hosted zones work across all regions.</li><li><strong>Routing policies:</strong> Simple, Failover, Latency, Weighted, Geolocation, Geoproximity, IP-based, Multivalue.</li><li><strong>Active-passive DR:</strong> Use Failover routing with PRIMARY/SECONDARY records + health checks.</li><li><strong>Active-active DR:</strong> Use Latency-based or Weighted routing with health checks on all records.</li><li>Health checks are always created in us-east-1 regardless of target region.</li><li>Lower TTLs days before cutover — cached resolvers may not honor low TTLs immediately.</li><li>Use <code>EvaluateTargetHealth: true</code> on alias records to auto-detect unhealthy ALBs.</li><li>Consider Amazon Application Recovery Controller (ARC) for data-plane-based failover (more resilient than DNS control plane operations during regional events).</li></ul><p style="margin-top:8px"><a href="https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy.html" target="_blank" rel="noopener">Routing Policies</a> | <a href="https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-failover-configuring.html" target="_blank" rel="noopener">Configuring Failover</a> | <a href="https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-failover-types.html" target="_blank" rel="noopener">Active-Active vs Active-Passive</a> | <a href="https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-failover.html" target="_blank" rel="noopener">Health Checks</a> | <a href="https://docs.aws.amazon.com/r53recovery/latest/dg/what-is-route53-recovery.html" target="_blank" rel="noopener">ARC</a></p>' },
        { title: 'AWS Backup', content: '<ul><li>Centralized backup across 15+ services.</li><li>Cross-region and cross-account copy for DR.</li><li>Test restore procedures regularly.</li></ul><p style="margin-top:8px"><a href="https://docs.aws.amazon.com/aws-backup/latest/devguide/whatisbackup.html" target="_blank" rel="noopener">AWS Docs: Backup</a> | <a href="https://docs.aws.amazon.com/prescriptive-guidance/latest/backup-recovery/aws-backup.html" target="_blank" rel="noopener">Prescriptive Guidance</a></p>' },
        { title: 'Elastic Disaster Recovery (DRS)', content: '<ul><li>Block-level replication for EC2-hosted workloads.</li><li>Pilot Light strategy with point-in-time recovery.</li><li>Non-disruptive DR drills.</li></ul><p style="margin-top:8px"><a href="https://docs.aws.amazon.com/drs/latest/userguide/what-is-drs.html" target="_blank" rel="noopener">AWS Docs: DRS</a> | <a href="https://docs.aws.amazon.com/drs/latest/userguide/getting-started.html" target="_blank" rel="noopener">Getting Started</a></p>' },
        { title: 'Monitoring & Observability', content: '<ul><li>CloudWatch is regional — recreate alarms/dashboards in target.</li><li>Cross-account observability for multi-region view.</li><li>Resilience Hub validates RTO/RPO targets.</li></ul><p style="margin-top:8px"><a href="https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/WhatIsCloudWatch.html" target="_blank" rel="noopener">CloudWatch</a> | <a href="https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Unified-Cross-Account.html" target="_blank" rel="noopener">Cross-Account</a> | <a href="https://docs.aws.amazon.com/resilience-hub/latest/userguide/what-is.html" target="_blank" rel="noopener">Resilience Hub</a></p>' },
        { title: 'Multi-Region Fundamentals', content: '<ul><li><strong>Design for failure:</strong> Assume any component, AZ, or region can become unavailable. Build recovery into the architecture from the start.</li><li><strong>Dependency isolation:</strong> Avoid hidden regional dependencies — ensure control plane calls, credential stores, and configuration sources are resilient or have fallbacks.</li><li><strong>Resilience mindset:</strong> Recovery is not complete until secondary protection is re-established. Validate that the recovered environment can itself survive a failure.</li><li>Understand RTO/RPO before choosing multi-region strategy.</li><li>Evaluate data consistency and access patterns.</li><li>Plan operational readiness and costs.</li></ul><p style="margin-top:8px"><a href="https://docs.aws.amazon.com/prescriptive-guidance/latest/aws-multi-region-fundamentals/introduction.html" target="_blank" rel="noopener">Prescriptive Guidance: Multi-Region</a> | <a href="https://docs.aws.amazon.com/prescriptive-guidance/latest/aws-multi-region-fundamentals/fundamental-1.html" target="_blank" rel="noopener">Fundamental 1: Design for Failure</a></p>' },
        { title: 'Well-Architected Reliability Pillar', content: '<ul><li>Design for failure — assume components will fail.</li><li>Test DR regularly. Manage config drift at DR site.</li><li>Automate recovery. Use data plane for failover.</li></ul><p style="margin-top:8px"><a href="https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/welcome.html" target="_blank" rel="noopener">Reliability Pillar</a> | <a href="https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/rel_planning_for_recovery_dr_tested.html" target="_blank" rel="noopener">Test DR</a></p>' },
        { title: 'Region Migration Guide Series (AWS re:Post)', content: '<ul><li><strong>Main guide:</strong> How do I migrate my services to another region?</li><li><strong>Security/Identity:</strong> IAM, STS, KMS, Cognito, Secrets Manager, ACM</li><li><strong>Compute/Containers:</strong> EC2, ECS, EKS</li><li><strong>Databases:</strong> Aurora, DynamoDB, ElastiCache, RDS, Redshift</li><li><strong>Networking:</strong> API Gateway, Route 53, VPN, Direct Connect, TGW, WAF, ELB</li><li><strong>Storage:</strong> FSx, S3, AWS Backup</li><li><strong>Application Integration:</strong> SNS, SQS</li><li><strong>Logical DB Dump:</strong> Alternative to snapshot-based migration</li></ul><p style="margin-top:8px"><a href="https://repost.aws/articles/ARgWzmR04xQSiPsgpe18T2Hw" target="_blank" rel="noopener">Main Guide</a> | <a href="https://repost.aws/articles/AROjnVwGlvRx2vESS9wrQEJQ" target="_blank" rel="noopener">Security</a> | <a href="https://repost.aws/articles/ARmJojQYTRTLy4v3rsPZ0kQg" target="_blank" rel="noopener">Compute</a> | <a href="https://repost.aws/articles/ARxnq1TlkJRQmu21ZYL3eggQ" target="_blank" rel="noopener">Databases</a> | <a href="https://repost.aws/articles/ARSGx1LTcRTQu7QUVNfXSOrQ" target="_blank" rel="noopener">Networking</a> | <a href="https://repost.aws/articles/ARS88PRFUwR4CYk2RqebZVzA" target="_blank" rel="noopener">Storage</a> | <a href="https://repost.aws/articles/AR9O2IVNBHThmpKwi9GvEkAA" target="_blank" rel="noopener">App Integration</a> | <a href="https://repost.aws/articles/ARrCNNrVE8RymB8ETkheiOhw" target="_blank" rel="noopener">Logical DB Dump</a></p>' },
        { title: 'Retry with Backoff Pattern', content: '<ul><li>Include retry with exponential backoff in all migration scripts and automations.</li><li>Handles API throttling, temporary network issues, and transient service unavailability.</li><li>AWS SDKs include built-in retry logic — configure max retries and backoff multiplier.</li><li>For Step Functions, configure retry with BackoffRate in state machine definitions.</li></ul><p style="margin-top:8px"><a href="https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/retry-backoff.html" target="_blank" rel="noopener">Retry with Backoff Pattern</a> | <a href="https://docs.aws.amazon.com/sdkref/latest/guide/feature-retry-behavior.html" target="_blank" rel="noopener">SDK Retry Behavior</a></p>' },
        { title: 'Console Troubleshooting & CloudShell', content: '<ul><li>If the console appears down, try a direct regional endpoint: <code>https://&lt;region-code&gt;.console.aws.amazon.com</code></li><li>If multi-session support is enabled, it may prevent access to impaired regions — disable it via account menu or clear browser cookies.</li><li>Use AWS CloudShell as a CLI fallback if you do not have a local CLI environment.</li></ul><p style="margin-top:8px"><a href="https://docs.aws.amazon.com/general/latest/gr/mgmt-console.html" target="_blank" rel="noopener">Console Endpoints</a> | <a href="https://docs.aws.amazon.com/cloudshell/latest/userguide/welcome.html" target="_blank" rel="noopener">CloudShell User Guide</a></p>' },
        { title: 'Service Quotas & Replicator Tool', content: '<ul><li>Service quotas are per-region — request increases in the target region early.</li><li>Use the <strong>Service Quotas Replicator</strong> tool to automate quota comparison and replication across regions.</li><li>For urgent requests, open a support case with migration context.</li></ul><p style="margin-top:8px"><a href="https://docs.aws.amazon.com/servicequotas/latest/userguide/gs-request-quota.html" target="_blank" rel="noopener">Viewing Quotas</a> | <a href="https://docs.aws.amazon.com/servicequotas/latest/userguide/request-quota-increase.html" target="_blank" rel="noopener">Request Increase</a> | <a href="https://github.com/aws-samples/sample-service-quotas-replicator-for-aws" target="_blank" rel="noopener">Quotas Replicator Tool</a> | <a href="https://docs.aws.amazon.com/awssupport/latest/user/create-service-quota-increase.html" target="_blank" rel="noopener">Support Case for Quotas</a></p>' },
        { title: 'Escalation & Support Resources', content: '<ul><li><strong>AWS Support Center:</strong> Open cases for technical guidance, quota increases, and incident response. Business and Enterprise support tiers provide faster response.</li><li><strong>Account Team / TAM:</strong> For Enterprise Support customers, engage your Technical Account Manager for coordinated incident response and migration guidance.</li><li><strong>AWS re:Post:</strong> Community-driven Q&A for migration patterns, troubleshooting, and best practices.</li><li><strong>AWS Health Dashboard:</strong> Monitor service health events and get personalized notifications for your account.</li></ul><p style="margin-top:8px"><a href="https://support.console.aws.amazon.com/" target="_blank" rel="noopener">AWS Support Center</a> | <a href="https://repost.aws/" target="_blank" rel="noopener">AWS re:Post</a> | <a href="https://health.aws.amazon.com/health/home" target="_blank" rel="noopener">AWS Health Dashboard</a> | <a href="https://docs.aws.amazon.com/awssupport/latest/user/getting-started.html" target="_blank" rel="noopener">Support Plans</a></p>' },
        { title: 'S3 Impairment & Database Migration', content: '<ul><li>During source-region S3 impairment, snapshot-based methods (RDS snapshot copy, cross-region automated backups, S3-based export) are unavailable.</li><li><strong>Available methods:</strong> Cross-region read replica promotion, Aurora Global Database failover, pg_dump/pg_restore, mysqldump/mydumper, Oracle Data Pump via DB link, BCP for SQL Server, AWS DMS.</li><li><strong>Unavailable methods:</strong> RDS/Aurora snapshot copy, cross-region automated backup replication, SQL Server native backup/restore via S3, Oracle Data Pump via S3 staging.</li><li>Always verify S3 status via the AWS Health Dashboard before choosing a migration method.</li></ul><p style="margin-top:8px"><a href="https://health.aws.amazon.com/health/status" target="_blank" rel="noopener">AWS Health Dashboard</a> | <a href="https://repost.aws/articles/ARrCNNrVE8RymB8ETkheiOhw" target="_blank" rel="noopener">Logical DB Dump Guide (re:Post)</a></p>' }
      ];
    },

    // ============================================================
    // getCostEstimate — rough cost estimation based on selections
    // NOTE: These are directional estimates only. Actual costs depend on
    // usage patterns, data transfer volumes, and specific instance types.
    // Ref: https://aws.amazon.com/pricing/
    // ============================================================
    getCostEstimate: function (s) {
      var monthly = 0;
      var items = [];
      var arch = this.getArchitecture(s);

      // Compute baseline
      if (s.appType === 'ec2' || s.appType === 'mixed') {
        var computeCost = arch === 'active-active' ? 800 : arch === 'warm-standby' ? 400 : arch === 'pilot-light' ? 100 : 50;
        monthly += computeCost;
        items.push({ name: 'EC2 / Compute (target region)', cost: computeCost, note: arch === 'active-active' ? 'Full production capacity' : arch === 'warm-standby' ? 'Scaled-down fleet' : arch === 'pilot-light' ? 'Minimal (AMIs + launch templates)' : 'IaC templates only' });
      }
      if (s.appType === 'containers') {
        var containerCost = arch === 'active-active' ? 600 : arch === 'warm-standby' ? 300 : 80;
        monthly += containerCost;
        items.push({ name: 'ECS/EKS / Containers', cost: containerCost, note: 'Fargate or EC2 backing' });
      }
      if (s.appType === 'serverless') {
        var serverlessCost = arch === 'active-active' ? 200 : 50;
        monthly += serverlessCost;
        items.push({ name: 'Lambda / Serverless', cost: serverlessCost, note: 'Pay-per-invocation in target' });
      }

      // Data replication
      var dbs = s.dbTypes || [];
      dbs.forEach(function (db) {
        var dbCost = 0;
        if (db === 'aurora') dbCost = arch === 'active-active' ? 500 : 200;
        else if (db === 'rds') dbCost = 250;
        else if (db === 'dynamodb') dbCost = arch === 'active-active' ? 300 : 150;
        else if (db === 'documentdb') dbCost = 200;
        else if (db === 'elasticache') dbCost = 150;
        else if (db === 's3') dbCost = 50;
        else if (db === 'rds-other') dbCost = 300;
        else if (db === 'rds-oracle') dbCost = 300;
        else if (db === 'rds-sqlserver') dbCost = 300;
        else if (db === 'opensearch') dbCost = 250;
        monthly += dbCost;
        items.push({ name: 'Data — ' + db, cost: dbCost, note: 'Replication + storage' });
      });

      // Networking
      var netCost = 100;
      if (s.networkTopology === 'hub-spoke' || s.networkTopology === 'multi-vpc-tgw') netCost = 250;
      if (s.networkConnectivity === 'direct-connect') netCost += 500;
      monthly += netCost;
      items.push({ name: 'Networking (VPC, NAT, TGW)', cost: netCost, note: s.networkConnectivity === 'direct-connect' ? 'Includes DX port hours' : 'VPC + NAT GW + data transfer' });

      // DNS + monitoring
      monthly += 30;
      items.push({ name: 'Route 53 + CloudWatch', cost: 30, note: 'Health checks + alarms' });

      return { monthly: monthly, items: items };
    },

    // ============================================================
    // getComplianceRegions — regions meeting common compliance requirements
    // Ref: https://aws.amazon.com/compliance/services-in-scope/
    // Ref: https://aws.amazon.com/about-aws/global-infrastructure/regional-product-services/
    // ============================================================
    getComplianceRegions: function (compliance) {
      // Based on AWS compliance programs page — these are directional.
      // Customer must verify current status at https://aws.amazon.com/compliance/services-in-scope/
      var regions = {
        'data-residency': {
          eu: ['eu-west-1 (Ireland)', 'eu-west-2 (London)', 'eu-west-3 (Paris)', 'eu-central-1 (Frankfurt)', 'eu-central-2 (Zurich)', 'eu-south-1 (Milan)', 'eu-south-2 (Spain)', 'eu-north-1 (Stockholm)'],
          mena: ['me-south-1 (Bahrain)', 'me-central-1 (UAE)', 'af-south-1 (Cape Town)', 'il-central-1 (Tel Aviv)'],
          apac: ['ap-southeast-1 (Singapore)', 'ap-southeast-2 (Sydney)', 'ap-northeast-1 (Tokyo)', 'ap-south-1 (Mumbai)']
        },
        'sovereignty': {
          note: 'For data sovereignty, consider AWS Regions within the same legal jurisdiction. EU customers may need to stay within EU regions. GovCloud (US) is available for US government workloads. Verify with your legal team.',
          eu: ['eu-west-1', 'eu-west-2', 'eu-west-3', 'eu-central-1', 'eu-central-2', 'eu-south-1', 'eu-south-2', 'eu-north-1'],
          govcloud: ['us-gov-west-1', 'us-gov-east-1']
        },
        'hipaa': {
          note: 'HIPAA-eligible services are available in most commercial regions. You must sign a BAA with AWS. Verify service-specific HIPAA eligibility.',
          regions: ['Most commercial AWS regions support HIPAA-eligible services']
        },
        'pci': {
          note: 'PCI DSS compliance is available across all commercial AWS regions. Verify specific service scope.',
          regions: ['All commercial AWS regions']
        }
      };
      return regions[compliance] || { note: 'Verify compliance requirements for your target region at https://aws.amazon.com/compliance/services-in-scope/', regions: ['Check AWS Compliance page'] };
    }
  }; // end RULES_ENGINE

  // ============================================================
  // State Management
  // ============================================================
  var STORAGE_KEY = 'rma-advisor-state';
  var state = {};
  var currentStep = 0;

  function saveState() { try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ answers: state, step: currentStep })); } catch (_) {} }
  function loadState() { try { var r = sessionStorage.getItem(STORAGE_KEY); if (r) { var d = JSON.parse(r); if (d && d.answers) { state = d.answers; /* Migrate old mode values */ if (state.urgencyMode === 'strategy') state.urgencyMode = 'architecture-strategy'; if (state.urgencyMode === 'panic') state.urgencyMode = 'immediate-dr'; currentStep = d.step || 0; return true; } } } catch (_) {} return false; }
  function clearState() { state = {}; currentStep = 0; try { sessionStorage.removeItem(STORAGE_KEY); } catch (_) {} }

  // ============================================================
  // DOM References
  // ============================================================
  var wizardContainer, progressFill, stepIndicator, btnBack, btnNext;
  var resultsSection, wizardSection, sidebarSteps, resumeBanner;

  function initDom() {
    wizardContainer = document.getElementById('wizard-container');
    progressFill = document.getElementById('progress-fill');
    stepIndicator = document.getElementById('step-indicator');
    btnBack = document.getElementById('btn-back');
    btnNext = document.getElementById('btn-next');
    resultsSection = document.getElementById('results-section');
    wizardSection = document.getElementById('wizard-section');
    sidebarSteps = document.getElementById('sidebar-steps');
    resumeBanner = document.getElementById('resume-banner');
  }

  // ============================================================
  // Conditional Step Logic
  // ============================================================
  function isStepVisible(i) {
    var step = WIZARD_STEPS[i];
    if (!step) return false;
    if (typeof step.conditional === 'function') return step.conditional(state);
    return true;
  }
  function nextVisibleStep(from) { for (var i = from + 1; i < WIZARD_STEPS.length; i++) { if (isStepVisible(i)) return i; } return -1; }
  function prevVisibleStep(from) { for (var i = from - 1; i >= 0; i--) { if (isStepVisible(i)) return i; } return -1; }
  function getVisibleStepInfo() {
    var vis = []; for (var i = 0; i < WIZARD_STEPS.length; i++) { if (isStepVisible(i)) vis.push(i); }
    var pos = vis.indexOf(currentStep);
    return { total: vis.length, position: pos >= 0 ? pos : 0, isLast: pos === vis.length - 1 };
  }

  // ============================================================
  // Sidebar
  // ============================================================
  function renderSidebar() {
    sidebarSteps.innerHTML = '';
    var n = 0;
    WIZARD_STEPS.forEach(function (step, i) {
      if (!isStepVisible(i)) return;
      n++;
      var a = document.createElement('a');
      a.href = '#'; a.className = 'sidebar__link';
      if (i === currentStep) a.classList.add('sidebar__link--active');
      var dot = document.createElement('span');
      dot.className = 'sidebar__dot';
      if (i < currentStep && (step.multiSelect ? (state[step.stateKey] || []).length > 0 : state[step.stateKey])) dot.classList.add('sidebar__dot--done');
      else if (i === currentStep) dot.classList.add('sidebar__dot--current');
      else dot.classList.add('sidebar__dot--pending');
      a.appendChild(dot);
      a.appendChild(document.createTextNode(n + '. ' + step.title));
      a.addEventListener('click', function (e) { e.preventDefault(); if (i <= currentStep && isStepVisible(i)) { currentStep = i; renderStep(); } });
      sidebarSteps.appendChild(a);
    });
  }

  // ============================================================
  // Wizard Step Rendering (supports single-select + multi-select)
  // ============================================================
  function renderStep() {
    var step = WIZARD_STEPS[currentStep];
    if (!step) return;
    var stepOptions = (step.getOptions ? step.getOptions(state) : step.options) || step.options;
    var info = getVisibleStepInfo();
    var pct = Math.round((info.position / info.total) * 100);
    progressFill.style.width = pct + '%';
    stepIndicator.textContent = 'Step ' + (info.position + 1) + ' of ' + info.total;

    var isPanic = state.urgencyMode === 'immediate-dr';
    var html = '<div class="wizard-step wizard-step--active">';
    if (isPanic && currentStep > 0) html += '<div class="callout callout--warning" style="margin-bottom:16px"><strong>🚨 ACCELERATED RECOVERY ACTIVE</strong> — Prioritizing fastest viable recovery path.</div>';
    html += '<div class="wizard-question">' + esc(step.question) + '</div>';
    html += '<div class="wizard-desc">' + esc(step.description) + '</div>';

    // FIX #1: Render discovery commands as proper code blocks (not inside card text)
    if (step.discoveryCommands && step.discoveryCommands.length) {
      step.discoveryCommands.forEach(function (dc, dci) {
        html += '<div class="code-block" style="margin-bottom:12px"><div class="code-block__header"><span>' + esc(dc.title) + '</span><button class="code-block__copy" data-copy-target="disc-cmd-' + dci + '">Copy</button></div>';
        html += '<pre id="disc-cmd-' + dci + '"><code>' + esc(dc.cmd) + '</code></pre></div>';
      });
    }

    if (step.multiSelect) {
      // Multi-select with "Select All"
      var selected = state[step.stateKey] || [];
      html += '<div style="margin-bottom:12px"><button class="btn btn--secondary" id="select-all-btn" style="padding:6px 14px;font-size:12px">' + (selected.length === stepOptions.length ? 'Deselect All' : 'Select All') + '</button></div>';
      html += '<div class="radio-tiles radio-tiles--' + step.columns + 'col" role="group" aria-label="' + esc(step.title) + '">';
      stepOptions.forEach(function (opt, i) {
        var checked = selected.indexOf(opt.value) >= 0;
        html += '<div class="radio-tile" role="checkbox" tabindex="0" aria-checked="' + checked + '" data-value="' + opt.value + '" data-step="' + step.stateKey + '">';
        if (opt.icon) html += '<span class="radio-tile__icon">' + opt.icon + '</span>';
        html += '<div class="radio-tile__title">' + esc(opt.label) + '</div>';
        html += '<div class="radio-tile__desc">' + esc(opt.description) + '</div></div>';
      });
      html += '</div>';
    } else {
      // Single-select
      var compactCls = step.compact ? ' radio-tiles--compact' : '';
      html += '<div class="radio-tiles radio-tiles--' + step.columns + 'col' + compactCls + '" role="radiogroup" aria-label="' + esc(step.title) + '">';
      stepOptions.forEach(function (opt, i) {
        var checked = state[step.stateKey] === opt.value;
        html += '<div class="radio-tile' + (step.compact ? ' radio-tile--compact' : '') + '" role="radio" tabindex="' + (i === 0 ? '0' : '-1') + '" aria-checked="' + checked + '" data-value="' + opt.value + '" data-step="' + step.stateKey + '">';
        if (opt.icon) html += '<span class="radio-tile__icon' + (step.compact ? ' radio-tile__icon--compact' : '') + '">' + opt.icon + '</span>';
        html += '<div class="radio-tile__title' + (step.compact ? ' radio-tile__title--compact' : '') + '">' + esc(opt.label) + '</div>';
        html += '<div class="radio-tile__desc' + (step.compact ? ' radio-tile__desc--compact' : '') + '">' + esc(opt.description) + '</div></div>';
      });
      html += '</div>';
    }

    // Partner comparison details (for panic-partner step)
    if (step.id === 'panic-partner' && step.partnerDetails) {
      var sel = state[step.stateKey];
      html += '<div id="partner-comparison" style="margin-top:20px">';

      // Comparison table
      html += '<div class="card" style="margin-bottom:16px"><div class="card__header"><span style="font-size:14px;font-weight:700">Partner Comparison</span></div><div class="card__body" style="overflow-x:auto">';
      html += '<table><thead><tr><th>Capability</th><th>ControlMonkey</th><th>N2W</th><th>Firefly</th></tr></thead><tbody>';
      html += '<tr><td style="font-weight:600">Primary Focus</td><td>Infra config DR (IaC)</td><td>Data backup & automated DR</td><td>Cloud asset mgmt + IaC DR</td></tr>';
      html += '<tr><td style="font-weight:600">Approach</td><td>Terraform snapshots</td><td>Native AWS snapshots</td><td>Auto-codify to IaC</td></tr>';
      html += '<tr><td style="font-weight:600">Data Backup</td><td style="color:var(--rd)">No (config only)</td><td style="color:var(--gr)">Yes (EC2, RDS, EBS, S3, DynamoDB)</td><td style="color:var(--rd)">No (IaC only)</td></tr>';
      html += '<tr><td style="font-weight:600">Infra Config Recovery</td><td style="color:var(--gr)">Yes (networks, IAM, DNS)</td><td style="color:var(--rd)">No</td><td style="color:var(--gr)">Yes (auto-codified)</td></tr>';
      html += '<tr><td style="font-weight:600">Drift Detection</td><td style="color:var(--gr)">Yes</td><td style="color:var(--rd)">No</td><td style="color:var(--gr)">Yes (real-time)</td></tr>';
      html += '<tr><td style="font-weight:600">Recovery Speed</td><td>Minutes (IaC deploy)</td><td>Seconds (automated)</td><td>Minutes (IaC pipeline)</td></tr>';
      html += '<tr><td style="font-weight:600">Best For</td><td>Reproducing infra baseline</td><td>Restoring data + instances</td><td>Full IaC codification + rebuild</td></tr>';
      html += '<tr><td style="font-weight:600">AWS Marketplace</td><td style="color:var(--gr)">Yes</td><td style="color:var(--gr)">Yes (Free tier available)</td><td style="color:var(--gr)">Yes</td></tr>';
      html += '</tbody></table></div></div>';

      // Show selected partner details
      if (sel && step.partnerDetails[sel]) {
        var p = step.partnerDetails[sel];
        html += '<div class="card" style="border-left:3px solid var(--bll)"><div class="card__header"><span style="font-size:14px;font-weight:700">' + esc(p.fullName) + ' — Details</span>';
        html += '<a href="' + p.marketplace + '" target="_blank" rel="noopener" style="font-size:12px;color:var(--bll);text-decoration:none;padding:4px 10px;background:rgba(9,114,211,.08);border-radius:4px">AWS Marketplace →</a>';
        html += '</div><div class="card__body">';
        html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">';
        html += '<div><div style="font-size:12px;font-weight:700;color:var(--gr);text-transform:uppercase;letter-spacing:.8px;margin-bottom:8px">Pros</div><ul style="padding-left:16px">';
        p.pros.forEach(function (pro) { html += '<li style="font-size:12px;color:var(--tl);margin-bottom:4px;list-style:disc">' + esc(pro) + '</li>'; });
        html += '</ul></div>';
        html += '<div><div style="font-size:12px;font-weight:700;color:var(--or);text-transform:uppercase;letter-spacing:.8px;margin-bottom:8px">Considerations</div><ul style="padding-left:16px">';
        p.cons.forEach(function (con) { html += '<li style="font-size:12px;color:var(--tl);margin-bottom:4px;list-style:disc">' + esc(con) + '</li>'; });
        html += '</ul></div></div>';
        html += '<div style="margin-top:12px;font-size:12px;color:var(--ts)"><strong>Focus:</strong> ' + esc(p.focus) + ' | <strong>Approach:</strong> ' + esc(p.approach) + '</div>';
        html += '</div></div>';
      }

      html += '</div>';
    }

    // Regional partner comparison table (for regional-partner-select step)
    if (step.id === 'regional-partner-select') {
      var partnerKeys = Object.keys(REGIONAL_PARTNERS);
      var rpSel = state[step.stateKey];
      html += '<div id="regional-partner-comparison" style="margin-top:20px">';

      // Header
      html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">';
      html += '<div style="display:flex;align-items:center;gap:8px">';
      html += '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--bll)" stroke-width="2"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M20 8v6M23 11h-6"/></svg>';
      html += '<span style="font-size:14px;font-weight:700;color:#fff">Partner Comparison</span></div>';
      var drToolStepForCount = WIZARD_STEPS.find(function (s) { return s.id === 'panic-partner'; });
      var drToolCount = drToolStepForCount && drToolStepForCount.partnerDetails ? Object.keys(drToolStepForCount.partnerDetails).length : 0;
      var totalPartnerCount = partnerKeys.length + drToolCount;
      html += '<span style="font-size:11px;color:var(--ts)">' + totalPartnerCount + ' partners · Click to expand</span>';
      html += '</div>';

      // Expandable partner rows
      partnerKeys.forEach(function (k) {
        var p = REGIONAL_PARTNERS[k];
        var isSelected = rpSel === k;
        var borderColor = isSelected ? 'var(--bll)' : 'var(--bd)';
        var bgColor = isSelected ? 'rgba(9,114,211,.04)' : 'var(--el)';
        var headerBg = isSelected ? 'rgba(9,114,211,.06)' : 'var(--sf)';

        html += '<div class="rpc-row" data-partner="' + k + '" style="border:1px solid ' + borderColor + ';border-radius:10px;margin-bottom:6px;overflow:hidden;background:' + bgColor + ';transition:border-color .15s">';

        // Collapsed header — always visible
        html += '<div class="rpc-row__header" role="button" tabindex="0" aria-expanded="false" style="display:flex;align-items:center;gap:10px;padding:10px 14px;cursor:pointer;background:' + headerBg + ';transition:background .15s">';
        // Name + selected badge
        html += '<div style="flex:1;min-width:0">';
        html += '<div style="display:flex;align-items:center;gap:6px">';
        html += '<span style="font-size:13px;font-weight:700;color:' + (isSelected ? 'var(--bll)' : '#fff') + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(p.fullName) + '</span>';
        if (isSelected) html += '<span style="padding:1px 6px;background:rgba(9,114,211,.15);border-radius:3px;font-size:9px;font-weight:700;color:var(--bll);text-transform:uppercase;letter-spacing:.3px">Selected</span>';
        html += '</div>';
        html += '<div style="font-size:11px;color:var(--ts);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(p.specialization) + '</div>';
        html += '</div>';
        // Quick pills
        html += '<div style="display:flex;gap:4px;flex-shrink:0;flex-wrap:nowrap">';
        if (p.marketplace) html += '<span style="padding:2px 7px;background:rgba(41,163,41,.1);border:1px solid rgba(41,163,41,.2);border-radius:3px;font-size:9px;font-weight:700;color:var(--gr)">Marketplace</span>';
        if (p.managedServices && p.managedServices.indexOf('Yes') === 0) html += '<span style="padding:2px 7px;background:rgba(9,114,211,.08);border:1px solid rgba(9,114,211,.15);border-radius:3px;font-size:9px;font-weight:600;color:var(--bll)">Managed</span>';
        html += '</div>';
        // Chevron
        html += '<svg class="rpc-chevron" width="12" height="12" viewBox="0 0 16 16" fill="none" style="flex-shrink:0;color:var(--ts);transition:transform .2s"><path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        html += '</div>';

        // Expandable detail — hidden by default
        html += '<div class="rpc-row__detail" style="display:none;padding:12px 14px;border-top:1px solid ' + borderColor + '">';

        // Info grid — 2 columns
        html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">';
        REGIONAL_COMPARISON_ROWS.forEach(function (row) {
          var val = REGIONAL_PARTNERS[k][row.key];
          html += '<div style="padding:6px 10px;background:var(--sf);border-radius:6px;border:1px solid rgba(53,65,80,.3)">';
          html += '<div style="font-size:9px;font-weight:700;color:var(--ts);text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px">' + esc(row.label) + '</div>';
          if (row.key === 'marketplace') {
            if (val) {
              html += '<a href="' + val + '" target="_blank" rel="noopener" style="font-size:11px;font-weight:600;color:var(--gr);text-decoration:none">✓ Listed →</a>';
            } else {
              html += '<span style="font-size:11px;color:var(--ts)">Not listed</span>';
            }
          } else {
            html += '<div style="font-size:11px;color:var(--tl);line-height:1.4">' + esc(val || '—') + '</div>';
          }
          html += '</div>';
        });
        html += '</div>';

        // Pros / Cons compact
        html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">';
        html += '<div style="padding:8px 10px;background:rgba(41,163,41,.03);border:1px solid rgba(41,163,41,.1);border-radius:6px">';
        html += '<div style="font-size:9px;font-weight:700;color:var(--gr);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Strengths</div>';
        p.pros.forEach(function (pro) { html += '<div style="font-size:11px;color:var(--tl);line-height:1.4;margin-bottom:3px;padding-left:10px;position:relative"><span style="position:absolute;left:0;color:var(--gr)">›</span>' + esc(pro) + '</div>'; });
        html += '</div>';
        html += '<div style="padding:8px 10px;background:rgba(255,153,0,.03);border:1px solid rgba(255,153,0,.1);border-radius:6px">';
        html += '<div style="font-size:9px;font-weight:700;color:var(--or);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Considerations</div>';
        p.cons.forEach(function (con) { html += '<div style="font-size:11px;color:var(--tl);line-height:1.4;margin-bottom:3px;padding-left:10px;position:relative"><span style="position:absolute;left:0;color:var(--or)">›</span>' + esc(con) + '</div>'; });
        html += '</div></div>';

        // Crisis contact (if available)
        if (p.crisisContact) {
          html += '<div style="margin-top:8px;padding:8px 10px;background:rgba(209,50,18,.06);border:1px solid rgba(209,50,18,.2);border-radius:6px">';
          html += '<div style="font-size:9px;font-weight:700;color:#d13212;text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px">\uD83D\uDEA8 Crisis Contact — ' + esc(p.crisisContact.region) + '</div>';
          html += '<div style="font-size:11px;color:var(--tl)">' + esc(p.crisisContact.context) + ': <a href="mailto:' + esc(p.crisisContact.email) + '" style="color:var(--bll);font-weight:600">' + esc(p.crisisContact.email) + '</a></div>';
          html += '</div>';
        }

        // Links
        html += '<div style="margin-top:8px;display:flex;gap:6px">';
        if (p.marketplace) html += '<a href="' + p.marketplace + '" target="_blank" rel="noopener" style="font-size:11px;color:var(--bll);text-decoration:none;padding:4px 10px;background:rgba(9,114,211,.06);border:1px solid rgba(9,114,211,.15);border-radius:4px;font-weight:600">🛒 Marketplace</a>';
        if (p.website) html += '<a href="' + p.website + '" target="_blank" rel="noopener" style="font-size:11px;color:var(--ts);text-decoration:none;padding:4px 10px;background:var(--sf);border:1px solid var(--bd);border-radius:4px">🌐 Website</a>';
        html += '</div>';

        html += '</div>'; // end detail
        html += '</div>'; // end rpc-row
      });

      // DR Tool partners (ControlMonkey, N2W, Firefly) — from panic-partner step
      var drToolStep = WIZARD_STEPS.find(function (s) { return s.id === 'panic-partner'; });
      if (drToolStep && drToolStep.partnerDetails) {
        var drKeys = Object.keys(drToolStep.partnerDetails);
        drKeys.forEach(function (k) {
          var dp = drToolStep.partnerDetails[k];
          var isSelected = rpSel === k;
          var borderColor = isSelected ? 'var(--bll)' : 'var(--bd)';
          var bgColor = isSelected ? 'rgba(9,114,211,.04)' : 'var(--el)';
          var headerBg = isSelected ? 'rgba(9,114,211,.06)' : 'var(--sf)';

          html += '<div class="rpc-row" data-partner="' + k + '" style="border:1px solid ' + borderColor + ';border-radius:10px;margin-bottom:6px;overflow:hidden;background:' + bgColor + ';transition:border-color .15s">';
          html += '<div class="rpc-row__header" role="button" tabindex="0" aria-expanded="false" style="display:flex;align-items:center;gap:10px;padding:10px 14px;cursor:pointer;background:' + headerBg + ';transition:background .15s">';
          html += '<div style="flex:1;min-width:0">';
          html += '<div style="display:flex;align-items:center;gap:6px">';
          html += '<span style="font-size:13px;font-weight:700;color:' + (isSelected ? 'var(--bll)' : '#fff') + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(dp.fullName) + '</span>';
          if (isSelected) html += '<span style="padding:1px 6px;background:rgba(9,114,211,.15);border-radius:3px;font-size:9px;font-weight:700;color:var(--bll);text-transform:uppercase;letter-spacing:.3px">Selected</span>';
          html += '</div>';
          html += '<div style="font-size:11px;color:var(--ts);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(dp.focus) + '</div>';
          html += '</div>';
          html += '<div style="display:flex;gap:4px;flex-shrink:0;flex-wrap:nowrap">';
          if (dp.marketplace) html += '<span style="padding:2px 7px;background:rgba(41,163,41,.1);border:1px solid rgba(41,163,41,.2);border-radius:3px;font-size:9px;font-weight:700;color:var(--gr)">Marketplace</span>';
          html += '<span style="padding:2px 7px;background:rgba(255,153,0,.1);border:1px solid rgba(255,153,0,.2);border-radius:3px;font-size:9px;font-weight:700;color:var(--or)">DR Tool</span>';
          html += '</div>';
          html += '<svg class="rpc-chevron" width="12" height="12" viewBox="0 0 16 16" fill="none" style="flex-shrink:0;color:var(--ts);transition:transform .2s"><path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
          html += '</div>';

          html += '<div class="rpc-row__detail" style="display:none;padding:12px 14px;border-top:1px solid ' + borderColor + '">';
          html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">';
          html += '<div style="padding:6px 10px;background:var(--sf);border-radius:6px;border:1px solid rgba(53,65,80,.3)"><div style="font-size:9px;font-weight:700;color:var(--ts);text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px">Focus</div><div style="font-size:11px;color:var(--tl);line-height:1.4">' + esc(dp.focus) + '</div></div>';
          html += '<div style="padding:6px 10px;background:var(--sf);border-radius:6px;border:1px solid rgba(53,65,80,.3)"><div style="font-size:9px;font-weight:700;color:var(--ts);text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px">Approach</div><div style="font-size:11px;color:var(--tl);line-height:1.4">' + esc(dp.approach) + '</div></div>';
          html += '<div style="padding:6px 10px;background:var(--sf);border-radius:6px;border:1px solid rgba(53,65,80,.3)"><div style="font-size:9px;font-weight:700;color:var(--ts);text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px">AWS Marketplace</div>';
          if (dp.marketplace) { html += '<a href="' + dp.marketplace + '" target="_blank" rel="noopener" style="font-size:11px;font-weight:600;color:var(--gr);text-decoration:none">\u2713 Listed \u2192</a>'; }
          else { html += '<span style="font-size:11px;color:var(--ts)">Not listed</span>'; }
          html += '</div>';
          html += '<div style="padding:6px 10px;background:var(--sf);border-radius:6px;border:1px solid rgba(53,65,80,.3)"><div style="font-size:9px;font-weight:700;color:var(--ts);text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px">Type</div><div style="font-size:11px;color:var(--tl);line-height:1.4">DR Tool / SaaS Platform</div></div>';
          html += '</div>';

          html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">';
          html += '<div style="padding:8px 10px;background:rgba(41,163,41,.03);border:1px solid rgba(41,163,41,.1);border-radius:6px">';
          html += '<div style="font-size:9px;font-weight:700;color:var(--gr);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Strengths</div>';
          dp.pros.forEach(function (pro) { html += '<div style="font-size:11px;color:var(--tl);line-height:1.4;margin-bottom:3px;padding-left:10px;position:relative"><span style="position:absolute;left:0;color:var(--gr)">\u203A</span>' + esc(pro) + '</div>'; });
          html += '</div>';
          html += '<div style="padding:8px 10px;background:rgba(255,153,0,.03);border:1px solid rgba(255,153,0,.1);border-radius:6px">';
          html += '<div style="font-size:9px;font-weight:700;color:var(--or);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Considerations</div>';
          dp.cons.forEach(function (con) { html += '<div style="font-size:11px;color:var(--tl);line-height:1.4;margin-bottom:3px;padding-left:10px;position:relative"><span style="position:absolute;left:0;color:var(--or)">\u203A</span>' + esc(con) + '</div>'; });
          html += '</div></div>';

          html += '<div style="margin-top:8px;display:flex;gap:6px">';
          if (dp.marketplace) html += '<a href="' + dp.marketplace + '" target="_blank" rel="noopener" style="font-size:11px;color:var(--bll);text-decoration:none;padding:4px 10px;background:rgba(9,114,211,.06);border:1px solid rgba(9,114,211,.15);border-radius:4px;font-weight:600">\uD83D\uDED2 Marketplace</a>';
          if (dp.website) html += '<a href="' + dp.website + '" target="_blank" rel="noopener" style="font-size:11px;color:var(--ts);text-decoration:none;padding:4px 10px;background:var(--sf);border:1px solid var(--bd);border-radius:4px">\uD83C\uDF10 Website</a>';
          html += '</div>';

          html += '</div>'; // end detail
          html += '</div>'; // end rpc-row
        });
      }

      html += '</div>';
    }

    html += '</div>';
    wizardContainer.innerHTML = html;

    // Wire partner comparison accordion rows
    wizardContainer.querySelectorAll('.rpc-row__header').forEach(function (hdr) {
      function toggleRow() {
        var detail = hdr.nextElementSibling;
        var chevron = hdr.querySelector('.rpc-chevron');
        var expanded = hdr.getAttribute('aria-expanded') === 'true';
        hdr.setAttribute('aria-expanded', expanded ? 'false' : 'true');
        if (detail) detail.style.display = expanded ? 'none' : 'block';
        if (chevron) chevron.style.transform = expanded ? '' : 'rotate(180deg)';
      }
      hdr.addEventListener('click', function (e) { if (!e.target.closest('a')) toggleRow(); });
      hdr.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleRow(); } });
    });

    // Wire tiles
    var tiles = wizardContainer.querySelectorAll('.radio-tile');
    if (step.multiSelect) {
      tiles.forEach(function (tile) {
        tile.addEventListener('click', function () { toggleMultiTile(tile, step); });
        tile.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleMultiTile(tile, step); } });
      });
      var selAllBtn = document.getElementById('select-all-btn');
      if (selAllBtn) {
        selAllBtn.addEventListener('click', function () {
          var sel = state[step.stateKey] || [];
          if (sel.length === stepOptions.length) { state[step.stateKey] = []; }
          else { state[step.stateKey] = stepOptions.map(function (o) { return o.value; }); }
          saveState(); renderStep();
        });
      }
    } else {
      tiles.forEach(function (tile) {
        tile.addEventListener('click', function () { selectTile(tile, tiles); });
        tile.addEventListener('keydown', function (e) { handleTileKeydown(e, tile, tiles); });
      });
    }

    // Button state
    btnBack.disabled = prevVisibleStep(currentStep) < 0;
    if (step.multiSelect) {
      btnNext.disabled = !(state[step.stateKey] && state[step.stateKey].length > 0);
    } else {
      btnNext.disabled = !state[step.stateKey] && !step.optional;
    }
    btnNext.textContent = info.isLast ? 'Complete Assessment \u2192' : 'Next \u2192';
    renderSidebar();
    saveState();

    // FIX #1: Wire copy buttons for discovery command code blocks in wizard steps
    if (step.discoveryCommands) {
      wizardContainer.querySelectorAll('.code-block__copy').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var el = document.getElementById(btn.getAttribute('data-copy-target'));
          if (!el) return;
          var text = el.textContent || el.innerText;
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function () { flashBtn2(btn, '\u2713 Copied!'); }).catch(function () { fbCopy(text, btn); });
          } else { fbCopy(text, btn); }
        });
      });
    }
  }

  function selectTile(tile, all) {
    all.forEach(function (t) { t.setAttribute('aria-checked', 'false'); t.setAttribute('tabindex', '-1'); });
    tile.setAttribute('aria-checked', 'true'); tile.setAttribute('tabindex', '0'); tile.focus();
    state[tile.dataset.step] = tile.dataset.value;
    btnNext.disabled = false; saveState();
    // Re-render partner comparison when partner is selected
    var currentStepDef = WIZARD_STEPS[currentStep];
    if (currentStepDef && (currentStepDef.id === 'panic-partner' || currentStepDef.id === 'regional-partner-select')) { renderStep(); }
  }
  function toggleMultiTile(tile, step) {
    var arr = state[step.stateKey] || [];
    var val = tile.dataset.value;
    var idx = arr.indexOf(val);
    if (idx >= 0) { arr.splice(idx, 1); tile.setAttribute('aria-checked', 'false'); }
    else { arr.push(val); tile.setAttribute('aria-checked', 'true'); }
    state[step.stateKey] = arr;
    btnNext.disabled = arr.length === 0;
    // Update select all button text
    var selAllBtn = document.getElementById('select-all-btn');
    if (selAllBtn) selAllBtn.textContent = arr.length === step.options.length ? 'Deselect All' : 'Select All';
    saveState();
  }
  function handleTileKeydown(e, tile, all) {
    var tiles = Array.from(all), idx = tiles.indexOf(tile), next;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); next = (idx + 1) % tiles.length; }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); next = (idx - 1 + tiles.length) % tiles.length; }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectTile(tile, all); return; }
    else return;
    tiles[idx].setAttribute('tabindex', '-1'); tiles[next].setAttribute('tabindex', '0'); tiles[next].focus();
  }
  function esc(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
  function escLink(s) { var t = esc(s); return t.replace(/(https?:\/\/[^\s<,)—–\u2014\u2013]+)/g, '<a href="$1" target="_blank" rel="noopener" style="color:var(--bll)">$1</a>'); }

  // ============================================================
  // Regional Partner Engagement Guide Rendering
  // ============================================================
  function renderPartnerEngagementGuide() {
      var selectedPartner = state.regionalPartner;
      var partnerInfo = REGIONAL_PARTNERS[selectedPartner] || null;

      // Check if this is a DR tool partner (controlmonkey, n2ws, firefly) selected from regional list
      var drToolStep = WIZARD_STEPS.find(function (s) { return s.id === 'panic-partner'; });
      var drToolInfo = drToolStep && drToolStep.partnerDetails && drToolStep.partnerDetails[selectedPartner] ? drToolStep.partnerDetails[selectedPartner] : null;

      // Hide tabs — show single panel only (NO strategy runbook tabs)
      document.getElementById('results-tabs').style.display = 'none';
      document.getElementById('sidebar-results-links').style.display = 'none';

      var displayName = partnerInfo ? partnerInfo.fullName : (drToolInfo ? drToolInfo.fullName : 'Unknown');
      var hasMarketplace = (partnerInfo && partnerInfo.marketplace) || (drToolInfo && drToolInfo.marketplace);
      var stepCount = 0;
      if (drToolInfo && drToolInfo.immediateSteps) stepCount = drToolInfo.immediateSteps.length;
      else if (partnerInfo && partnerInfo.marketplace && partnerInfo.engagementSteps) stepCount = partnerInfo.engagementSteps.length;
      else stepCount = 4;

      // KPI
      var kpi = document.getElementById('kpi-grid');
      kpi.innerHTML = kpiCard('MODE', 'Regional Partner Assistance', 'blue', 'Partner-led Recovery') +
        kpiCard('Partner', displayName, 'blue', '') +
        kpiCard('Steps', String(stepCount), 'orange', hasMarketplace ? 'Engagement steps' : 'Discovery steps') +
        kpiCard('Action', hasMarketplace ? 'Engage Partner' : 'Contact Partner', 'green', 'Follow steps below');

      // Render into tab-summary (the only visible panel)
      var panel = document.getElementById('tab-summary');
      panel.classList.add('results-panel--active');
      var h = '';
      h += '<div class="callout callout--info" style="margin-bottom:20px"><strong>\uD83E\uDD1D Partner Engagement Workflow</strong><br>This tool provides a recommended recovery approach. AWS partners and ISV tools are optional and can support implementation and accelerate execution. If you choose to engage a partner, follow the steps below. Steps 1\u20134 are customer actions; steps 5+ are executed by the partner.</div>';

      // AWS Resilience Partners callout
      h += '<div class="callout callout--success" style="margin-bottom:16px;font-size:12px">';
      h += '<strong>\uD83C\uDFC6 AWS Resilience Partners</strong><br>';
      h += 'These are MENA-region AWS partners with experience in resilience and migration workloads. Some partners hold verified <strong>AWS Competencies</strong> (e.g., AWS Resilience Competency, AWS Security Competency) — check individual partner profiles for details.';
      h += '<div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap">';
      h += '<a href="https://partners.amazonaws.com/search/partners?facets=Use%20Case%20%3A%20Resilience&loc=United%20Arab%20Emirates" target="_blank" rel="noopener" style="font-size:11px;color:var(--bll);text-decoration:none;padding:3px 10px;background:rgba(9,114,211,.06);border:1px solid rgba(9,114,211,.15);border-radius:4px;font-weight:600">\uD83C\uDDE6\uD83C\uDDEA UAE Partners</a>';
      h += '<a href="https://partners.amazonaws.com/search/partners?facets=Use%20Case%20%3A%20Resilience&loc=Saudi%20Arabia" target="_blank" rel="noopener" style="font-size:11px;color:var(--bll);text-decoration:none;padding:3px 10px;background:rgba(9,114,211,.06);border:1px solid rgba(9,114,211,.15);border-radius:4px;font-weight:600">\uD83C\uDDF8\uD83C\uDDE6 Saudi Arabia Partners</a>';
      h += '<a href="https://partners.amazonaws.com/search/partners?facets=Use%20Case%20%3A%20Resilience&loc=Bahrain" target="_blank" rel="noopener" style="font-size:11px;color:var(--bll);text-decoration:none;padding:3px 10px;background:rgba(9,114,211,.06);border:1px solid rgba(9,114,211,.15);border-radius:4px;font-weight:600">\uD83C\uDDE7\uD83C\uDDED Bahrain Partners</a>';
      h += '</div>';
      h += '<div style="margin-top:6px;font-size:11px;color:var(--ts)">Explore verified AWS Competency partners in your region via the AWS Partner Directory.</div>';
      h += '</div>';

      // Health-aware region advisory
      h += renderHealthRegionAdvisory();

      // S3 impairment advisory for partner engagement
      // Note: In Partner Mode, the S3 availability question is not shown in the wizard
      // (it's only visible in Architecture Strategy mode). So sourceS3Availability will
      // typically be undefined. Treat undefined the same as 'unknown' — show conditional guidance.
      var partnerS3Status = state.sourceS3Availability || 'not-set';
      if (partnerS3Status === 'impaired') {
        h += '<div class="callout callout--warning" style="margin-bottom:16px;border-left:3px solid #d13212">';
        h += '<strong>\u26A0\uFE0F S3 Impairment Notice</strong><br>';
        h += '<span style="font-size:13px">S3 is impaired in the source region. S3-dependent recovery actions (S3 sync, S3 replication, snapshot copy via S3) are <strong>not available</strong> until S3 is restored. ';
        h += 'Partner engagement steps that reference S3 commands should be treated as <strong>deferred / post-recovery actions</strong>. ';
        h += 'Inform your partner of the S3 impairment status during initial consultation.</span>';
        h += '</div>';
      } else if (partnerS3Status === 'unknown' || partnerS3Status === 'not-set') {
        h += '<div class="callout callout--info" style="margin-bottom:16px">';
        h += '<strong>\u2753 S3 Availability</strong><br>';
        h += '<span style="font-size:13px">Validate S3 availability via the <a href="https://health.aws.amazon.com/health/status" target="_blank" rel="noopener" style="color:var(--bll)">AWS Health Dashboard</a> before executing S3-dependent recovery steps. If S3 is impaired, defer S3-related actions until service is restored.</span>';
        h += '</div>';
      }

      // Partner briefing: DR strategy, backup location, backup technology
      var drLabel = state.drStrategy || 'Not provided';
      var blLabel = state.backupLocation || 'Not provided';
      var btLabel = state.backupTechnology || 'Not provided';
      h += '<div class="result-card" style="border-left:3px solid var(--or);margin-bottom:20px"><div class="result-card__header"><span class="result-card__title">\uD83D\uDCCB Partner Briefing</span></div><div class="result-card__body">';
      h += '<p style="font-size:13px;color:var(--tl);margin-bottom:12px">Share this information with your partner to provide full context for recovery planning.</p>';
      h += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:12px">';
      h += '<div style="padding:10px;background:var(--sf);border-radius:6px;border:1px solid var(--bd)"><div style="font-size:11px;font-weight:700;color:var(--ts);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">DR Strategy</div><div style="font-size:13px;color:var(--tl);font-weight:600">' + esc(drLabel) + '</div></div>';
      h += '<div style="padding:10px;background:var(--sf);border-radius:6px;border:1px solid var(--bd)"><div style="font-size:11px;font-weight:700;color:var(--ts);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Backup Location</div><div style="font-size:13px;color:var(--tl);font-weight:600">' + esc(blLabel) + '</div></div>';
      h += '<div style="padding:10px;background:var(--sf);border-radius:6px;border:1px solid var(--bd)"><div style="font-size:11px;font-weight:700;color:var(--ts);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Backup Technology</div><div style="font-size:13px;color:var(--tl);font-weight:600">' + esc(btLabel) + '</div></div>';
      h += '</div>';
      h += '<p style="font-size:12px;color:var(--ts);margin-bottom:12px">Share your <strong>resources-inventory.csv</strong> and <strong>resource-dependencies.csv</strong> files (from the Environment Discovery Script) with the partner to accelerate assessment.</p>';
      h += '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">';
      h += '<button class="btn btn--primary" onclick="downloadDiscoveryScript()" style="font-size:12px;padding:6px 14px">\uD83D\uDCE5 Download Environment Discovery Script</button>';
      h += '<span style="font-size:11px;color:var(--ts)">Run in your AWS account, then share the CSV output with your partner</span>';
      h += '</div>';
      h += '</div></div>';

      // ── DR Tool partners (ControlMonkey, N2W, Firefly) selected from regional list ──
      if (drToolInfo) {
        h += '<div class="result-card" style="border-left:3px solid var(--bll);margin-bottom:20px"><div class="result-card__header">';
        h += '<span class="result-card__title">' + esc(drToolInfo.fullName) + '</span>';
        if (drToolInfo.marketplace) {
          h += '<a href="' + drToolInfo.marketplace + '" target="_blank" rel="noopener" style="font-size:12px;color:var(--bll);text-decoration:none;padding:4px 12px;background:rgba(9,114,211,.08);border-radius:4px">AWS Marketplace \u2192</a>';
        }
        h += '</div><div class="result-card__body">';
        h += '<p style="font-size:13px;color:var(--tl);margin-bottom:8px"><strong>Focus:</strong> ' + esc(drToolInfo.focus) + '</p>';
        h += '<p style="font-size:13px;color:var(--tl);margin-bottom:16px"><strong>Approach:</strong> ' + esc(drToolInfo.approach) + '</p>';
        drToolInfo.immediateSteps.forEach(function (s, i) {
          var stepNum = i + 1;
          var isPartnerStep = stepNum >= 5;
          var badgeClass = isPartnerStep ? 'badge--partner' : 'badge--customer';
          var badgeLabel = isPartnerStep ? 'Executed by Partner' : 'Customer Action';
          h += '<div class="runbook-step" style="margin-bottom:8px"><div class="runbook-step__header" role="button" tabindex="0" aria-expanded="true">';
          h += '<div class="runbook-step__number" style="background:var(--bll)">' + stepNum + '</div>';
          h += '<div class="runbook-step__title">' + esc(s.step) + '</div>';
          h += '<span class="badge ' + badgeClass + '"><span class="badge__dot"></span>' + badgeLabel + '</span>';
          h += '<span class="runbook-step__chevron">\u25BC</span></div>';
          h += '<div class="runbook-step__body runbook-step__body--open">';
          if (!isPartnerStep && stepNum <= 2) {
            h += '<p style="font-size:12px;color:var(--ts);margin-bottom:8px;font-style:italic">\uD83D\uDCC2 Tip: Share your resources-inventory.csv and resource-dependencies.csv with the partner to accelerate this step.</p>';
          }
          h += '<p style="font-size:13px;color:var(--tl);margin-bottom:12px">' + escLink(s.detail) + '</p>';
          if (s.cmd && isPartnerStep) {
            h += '<div class="code-block"><div class="code-block__header"><span>bash</span><button class="code-block__copy" data-copy-target="rp-cmd-' + i + '">Copy</button></div>';
            h += '<pre id="rp-cmd-' + i + '"><code>' + esc(s.cmd) + '</code></pre></div>';
          } else if (s.cmd && !isPartnerStep) {
            var isReadOnly = /^aws\s+\S+\s+(describe|list|get)-/.test(s.cmd);
            if (isReadOnly) {
              h += '<div class="code-block"><div class="code-block__header"><span>bash</span><button class="code-block__copy" data-copy-target="rp-cmd-' + i + '">Copy</button></div>';
              h += '<pre id="rp-cmd-' + i + '"><code>' + esc(s.cmd) + '</code></pre></div>';
            }
          }
          h += '</div></div>';
        });
        h += '<div style="margin-top:16px;display:flex;gap:8px;flex-wrap:wrap">';
        if (drToolInfo.marketplace) h += '<a href="' + drToolInfo.marketplace + '" target="_blank" rel="noopener" class="btn btn--primary" style="font-size:13px;padding:8px 16px;text-decoration:none">\uD83D\uDED2 AWS Marketplace</a>';
        if (drToolInfo.website) h += '<a href="' + drToolInfo.website + '" target="_blank" rel="noopener" class="btn btn--secondary" style="font-size:13px;padding:8px 16px;text-decoration:none">\uD83C\uDF10 Partner Website</a>';
        h += '</div></div></div>';

      // ── Partners WITH marketplace offering → show full engagement steps ──
      } else if (partnerInfo && partnerInfo.marketplace) {
        h += '<div class="result-card" style="border-left:3px solid var(--bll);margin-bottom:20px"><div class="result-card__header">';
        h += '<span class="result-card__title">' + esc(partnerInfo.fullName) + '</span>';
        h += '<a href="' + partnerInfo.marketplace + '" target="_blank" rel="noopener" style="font-size:12px;color:var(--bll);text-decoration:none;padding:4px 12px;background:rgba(9,114,211,.08);border-radius:4px">AWS Marketplace \u2192</a>';
        h += '</div><div class="result-card__body">';
        h += '<p style="font-size:13px;color:var(--tl);margin-bottom:8px"><strong>Focus:</strong> ' + esc(partnerInfo.focus) + '</p>';
        h += '<p style="font-size:13px;color:var(--tl);margin-bottom:8px"><strong>Region:</strong> ' + esc(partnerInfo.region) + '</p>';
        h += '<p style="font-size:13px;color:var(--tl);margin-bottom:16px"><strong>Specialization:</strong> ' + esc(partnerInfo.specialization) + '</p>';
        h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">';
        h += '<div><div style="font-size:12px;font-weight:700;color:var(--gr);text-transform:uppercase;letter-spacing:.8px;margin-bottom:8px">Pros</div><ul style="padding-left:16px">';
        partnerInfo.pros.forEach(function (pro) { h += '<li style="font-size:12px;color:var(--tl);margin-bottom:4px;list-style:disc">' + esc(pro) + '</li>'; });
        h += '</ul></div>';
        h += '<div><div style="font-size:12px;font-weight:700;color:var(--or);text-transform:uppercase;letter-spacing:.8px;margin-bottom:8px">Considerations</div><ul style="padding-left:16px">';
        partnerInfo.cons.forEach(function (con) { h += '<li style="font-size:12px;color:var(--tl);margin-bottom:4px;list-style:disc">' + esc(con) + '</li>'; });
        h += '</ul></div></div>';
        h += '</div></div>';
        // Crisis contact (urgency email for region impairment)
        if (partnerInfo.crisisContact) {
          h += '<div class="callout callout--warning" style="margin-bottom:16px;border-left:3px solid #d13212">';
          h += '<strong>\uD83D\uDEA8 Urgency Crisis Contact — ' + esc(partnerInfo.crisisContact.region) + ' Region Impairment</strong><br>';
          h += '<span style="font-size:13px">' + esc(partnerInfo.crisisContact.context) + ': ';
          h += '<a href="mailto:' + esc(partnerInfo.crisisContact.email) + '" style="color:var(--bll);font-weight:600">' + esc(partnerInfo.crisisContact.email) + '</a></span>';
          h += '</div>';
        }
        // Marketplace offerings (if partner has multiple listings)
        if (partnerInfo.marketplaceOfferings && partnerInfo.marketplaceOfferings.length) {
          h += '<div class="result-card" style="border-left:3px solid var(--bll);margin-bottom:16px"><div class="result-card__header"><span class="result-card__title">\uD83D\uDED2 AWS Marketplace Offerings</span></div><div class="result-card__body">';
          partnerInfo.marketplaceOfferings.forEach(function (off) {
            h += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><a href="' + off.url + '" target="_blank" rel="noopener" style="font-size:13px;color:var(--bll);text-decoration:none">\u2192 ' + esc(off.label) + '</a></div>';
          });
          h += '</div></div>';
        }
        // Full engagement steps (only for marketplace partners)
        // Pre-migration advisory — applies to all partner workflows
        h += '<div class="callout callout--warning" style="margin-top:16px;margin-bottom:12px">';
        h += '<strong>⚠ Pre-Migration Prerequisites (complete before or alongside partner engagement):</strong>';
        h += '<ul style="padding-left:20px;margin-top:8px;font-size:12px">';
        h += '<li style="list-style:disc;margin-bottom:4px"><strong>Enable target region</strong> — Opt-in regions (launched after March 20, 2019) must be enabled: <code>aws account enable-region --region-name &lt;TARGET_REGION&gt;</code> (<a href="https://docs.aws.amazon.com/accounts/latest/reference/manage-acct-regions.html" target="_blank" rel="noopener" style="color:var(--bll)">docs</a>)</li>';
        h += '<li style="list-style:disc;margin-bottom:4px"><strong>Request service quota increases</strong> — Quotas are per-region. Use the <a href="https://github.com/aws-samples/sample-service-quotas-replicator-for-aws" target="_blank" rel="noopener" style="color:var(--bll)">Service Quotas Replicator</a> to compare and replicate quotas.</li>';
        h += '<li style="list-style:disc;margin-bottom:4px"><strong>Check API availability</strong> — If APIs are unresponsive for the source region, migration using AWS methods is not possible. Check <a href="https://health.aws.amazon.com/health/home" target="_blank" rel="noopener" style="color:var(--bll)">AWS Health Dashboard</a>.</li>';
        h += '<li style="list-style:disc;margin-bottom:4px"><strong>Retry/backoff</strong> — Include retry with exponential backoff in all migration scripts (<a href="https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/retry-backoff.html" target="_blank" rel="noopener" style="color:var(--bll)">pattern docs</a>).</li>';
        h += '<li style="list-style:disc;margin-bottom:4px"><strong>Configure regional STS endpoints</strong> — Use regional STS endpoints for resilience (<a href="https://repost.aws/articles/AROjnVwGlvRx2vESS9wrQEJQ" target="_blank" rel="noopener" style="color:var(--bll)">security migration guide</a>).</li>';
        h += '<li style="list-style:disc;margin-bottom:4px"><strong>Console issues?</strong> — Try a direct regional endpoint: <code>https://&lt;region-code&gt;.console.aws.amazon.com</code>. No local CLI? Use <a href="https://docs.aws.amazon.com/cloudshell/latest/userguide/welcome.html" target="_blank" rel="noopener" style="color:var(--bll)">AWS CloudShell</a>.</li>';
        h += '<li style="list-style:disc;margin-bottom:4px"><strong>Network readiness</strong> — Verify VPC connectivity, routing, and hybrid networking links (VPN/Direct Connect) to the recovery region.</li>';
        h += '<li style="list-style:disc;margin-bottom:4px"><strong>DNS readiness</strong> — Confirm Route 53 health checks, TTL settings, and failover routing policies are configured.</li>';
        h += '</ul></div>';
        h += '<div style="margin-top:4px;margin-bottom:8px;display:flex;align-items:center;gap:8px">';
        h += '<span style="font-size:13px;font-weight:700;color:var(--bll)">Partner Engagement Workflow</span>';
        h += '<span style="font-size:11px;color:var(--ts)">(' + partnerInfo.engagementSteps.length + ' steps)</span>';
        h += '</div>';
        partnerInfo.engagementSteps.forEach(function (s, i) {
          var stepNum = i + 1;
          var isPartnerStep = stepNum >= 5;
          var badgeClass = isPartnerStep ? 'badge--partner' : 'badge--customer';
          var badgeLabel = isPartnerStep ? 'Executed by Partner' : 'Customer Action';
          var borderColor = isPartnerStep ? 'var(--or)' : 'var(--bll)';
          h += '<div class="runbook-step" style="margin-bottom:8px;border-left:2px solid ' + borderColor + '"><div class="runbook-step__header" role="button" tabindex="0" aria-expanded="true">';
          h += '<div class="runbook-step__number" style="background:' + borderColor + '">' + stepNum + '</div>';
          h += '<div class="runbook-step__title">' + esc(s.step) + '</div>';
          h += '<span class="badge ' + badgeClass + '"><span class="badge__dot"></span>' + badgeLabel + '</span>';
          h += '<span class="runbook-step__chevron">\u25BC</span></div>';
          h += '<div class="runbook-step__body runbook-step__body--open">';
          if (!isPartnerStep && stepNum <= 2) {
            h += '<p style="font-size:12px;color:var(--ts);margin-bottom:8px;font-style:italic">\uD83D\uDCC2 Tip: Share your resources-inventory.csv and resource-dependencies.csv with the partner to accelerate this step.</p>';
          }
          h += '<p style="font-size:13px;color:var(--tl);margin-bottom:12px">' + escLink(s.detail) + '</p>';
          if (s.cmd && isPartnerStep) {
            h += '<div class="code-block"><div class="code-block__header"><span>bash</span><button class="code-block__copy" data-copy-target="rp-cmd-' + i + '">Copy</button></div>';
            h += '<pre id="rp-cmd-' + i + '"><code>' + esc(s.cmd) + '</code></pre></div>';
          } else if (s.cmd && !isPartnerStep) {
            var isReadOnly = /^aws\s+\S+\s+(describe|list|get)-/.test(s.cmd);
            if (isReadOnly) {
              h += '<div class="code-block"><div class="code-block__header"><span>bash</span><button class="code-block__copy" data-copy-target="rp-cmd-' + i + '">Copy</button></div>';
              h += '<pre id="rp-cmd-' + i + '"><code>' + esc(s.cmd) + '</code></pre></div>';
            }
          }
          if (s.validation && s.validation.length) {
            h += '<div style="margin-top:8px;font-size:12px;color:var(--ts)"><strong>Validation Checks:</strong><ul style="padding-left:16px;margin-top:4px">';
            s.validation.forEach(function (v) { h += '<li style="list-style:disc;margin-bottom:2px">' + esc(v) + '</li>'; });
            h += '</ul></div>';
          }
          h += '</div></div>';
        });
        h += '<div style="margin-top:16px;display:flex;gap:8px;flex-wrap:wrap">';
        h += '<a href="' + partnerInfo.website + '" target="_blank" rel="noopener" class="btn btn--primary" style="font-size:13px;padding:8px 16px;text-decoration:none">\uD83C\uDF10 Partner Website</a>';
        h += '<a href="' + partnerInfo.marketplace + '" target="_blank" rel="noopener" class="btn btn--secondary" style="font-size:13px;padding:8px 16px;text-decoration:none">\uD83D\uDED2 AWS Marketplace</a>';
        h += '</div>';

      // ── Partners WITHOUT marketplace → contact info + basic discovery only ──
      } else if (partnerInfo) {
        h += '<div class="result-card" style="border-left:3px solid var(--bll);margin-bottom:20px"><div class="result-card__header">';
        h += '<span class="result-card__title">' + esc(partnerInfo.fullName) + '</span>';
        h += '</div><div class="result-card__body">';
        h += '<p style="font-size:13px;color:var(--tl);margin-bottom:8px"><strong>Focus:</strong> ' + esc(partnerInfo.focus) + '</p>';
        h += '<p style="font-size:13px;color:var(--tl);margin-bottom:8px"><strong>Region:</strong> ' + esc(partnerInfo.region) + '</p>';
        h += '<p style="font-size:13px;color:var(--tl);margin-bottom:16px"><strong>Specialization:</strong> ' + esc(partnerInfo.specialization) + '</p>';
        h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">';
        h += '<div><div style="font-size:12px;font-weight:700;color:var(--gr);text-transform:uppercase;letter-spacing:.8px;margin-bottom:8px">Pros</div><ul style="padding-left:16px">';
        partnerInfo.pros.forEach(function (pro) { h += '<li style="font-size:12px;color:var(--tl);margin-bottom:4px;list-style:disc">' + esc(pro) + '</li>'; });
        h += '</ul></div>';
        h += '<div><div style="font-size:12px;font-weight:700;color:var(--or);text-transform:uppercase;letter-spacing:.8px;margin-bottom:8px">Considerations</div><ul style="padding-left:16px">';
        partnerInfo.cons.forEach(function (con) { h += '<li style="font-size:12px;color:var(--tl);margin-bottom:4px;list-style:disc">' + esc(con) + '</li>'; });
        h += '</ul></div></div>';
        h += '</div></div>';

        // Crisis contact (urgency email for region impairment)
        if (partnerInfo.crisisContact) {
          h += '<div class="callout callout--warning" style="margin-bottom:16px;border-left:3px solid #d13212">';
          h += '<strong>\uD83D\uDEA8 Urgency Crisis Contact — ' + esc(partnerInfo.crisisContact.region) + ' Region Impairment</strong><br>';
          h += '<span style="font-size:13px">' + esc(partnerInfo.crisisContact.context) + ': ';
          h += '<a href="mailto:' + esc(partnerInfo.crisisContact.email) + '" style="color:var(--bll);font-weight:600">' + esc(partnerInfo.crisisContact.email) + '</a></span>';
          h += '</div>';
        }

        // No marketplace — show contact instructions
        h += '<div class="callout callout--info" style="margin-bottom:16px"><strong>No AWS Marketplace listing available</strong><br>Contact this partner directly via their website to discuss engagement, pricing, and scope for your DR/migration project.</div>';

        // Pre-migration advisory — applies to all partner workflows
        h += '<div class="callout callout--warning" style="margin-bottom:12px">';
        h += '<strong>⚠ Pre-Migration Prerequisites (complete before or alongside partner engagement):</strong>';
        h += '<ul style="padding-left:20px;margin-top:8px;font-size:12px">';
        h += '<li style="list-style:disc;margin-bottom:4px"><strong>Enable target region</strong> — Opt-in regions (launched after March 20, 2019) must be enabled: <code>aws account enable-region --region-name &lt;TARGET_REGION&gt;</code> (<a href="https://docs.aws.amazon.com/accounts/latest/reference/manage-acct-regions.html" target="_blank" rel="noopener" style="color:var(--bll)">docs</a>)</li>';
        h += '<li style="list-style:disc;margin-bottom:4px"><strong>Request service quota increases</strong> — Quotas are per-region. Use the <a href="https://github.com/aws-samples/sample-service-quotas-replicator-for-aws" target="_blank" rel="noopener" style="color:var(--bll)">Service Quotas Replicator</a> to compare and replicate quotas.</li>';
        h += '<li style="list-style:disc;margin-bottom:4px"><strong>Check API availability</strong> — If APIs are unresponsive for the source region, migration using AWS methods is not possible. Check <a href="https://health.aws.amazon.com/health/home" target="_blank" rel="noopener" style="color:var(--bll)">AWS Health Dashboard</a>.</li>';
        h += '<li style="list-style:disc;margin-bottom:4px"><strong>Retry/backoff</strong> — Include retry with exponential backoff in all migration scripts (<a href="https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/retry-backoff.html" target="_blank" rel="noopener" style="color:var(--bll)">pattern docs</a>).</li>';
        h += '<li style="list-style:disc;margin-bottom:4px"><strong>Configure regional STS endpoints</strong> — Use regional STS endpoints for resilience (<a href="https://repost.aws/articles/AROjnVwGlvRx2vESS9wrQEJQ" target="_blank" rel="noopener" style="color:var(--bll)">security migration guide</a>).</li>';
        h += '<li style="list-style:disc;margin-bottom:4px"><strong>Console issues?</strong> — Try a direct regional endpoint: <code>https://&lt;region-code&gt;.console.aws.amazon.com</code>. No local CLI? Use <a href="https://docs.aws.amazon.com/cloudshell/latest/userguide/welcome.html" target="_blank" rel="noopener" style="color:var(--bll)">AWS CloudShell</a>.</li>';
        h += '<li style="list-style:disc;margin-bottom:4px"><strong>Network readiness</strong> — Verify VPC connectivity, routing, and hybrid networking links (VPN/Direct Connect) to the recovery region.</li>';
        h += '<li style="list-style:disc;margin-bottom:4px"><strong>DNS readiness</strong> — Confirm Route 53 health checks, TTL settings, and failover routing policies are configured.</li>';
        h += '</ul></div>';

        // Basic discovery steps the user can run before engaging (Customer Actions)
        h += '<div class="result-card" style="margin-bottom:16px"><div class="result-card__header"><span class="result-card__title">Partner Engagement Workflow — Customer Actions</span></div><div class="result-card__body">';
        h += '<p style="font-size:13px;color:var(--tl);margin-bottom:8px">Run these commands to document your current environment before engaging a partner (optional). This will accelerate the initial consultation.</p>';
        h += '<div style="margin-bottom:12px;padding:12px;background:rgba(35,47,62,.6);border:1px solid var(--bd);border-radius:6px">';
        h += '<p style="font-size:12px;color:var(--tl);margin-bottom:8px;font-weight:600">\uD83D\uDCC2 Recommended: Run the full Environment Discovery Script for a complete inventory and dependency map.</p>';
        h += '<button class="btn btn--primary" onclick="downloadDiscoveryScript()" style="font-size:12px;padding:6px 14px">\uD83D\uDCE5 Download Environment Discovery Script</button>';
        h += '<p style="font-size:11px;color:var(--ts);margin-top:6px;margin-bottom:0">The script produces resources-inventory.csv and resource-dependencies.csv — share both with your partner.</p>';
        h += '</div>';
        var discoverySteps = [
          { step: 'Inventory EC2 Instances', cmd: 'aws ec2 describe-instances --query "Reservations[].Instances[].{ID:InstanceId,Type:InstanceType,State:State.Name,AZ:Placement.AvailabilityZone}" --output table' },
          { step: 'Inventory RDS Databases', cmd: 'aws rds describe-db-instances --query "DBInstances[].{ID:DBInstanceIdentifier,Engine:Engine,Status:DBInstanceStatus}" --output table' },
          { step: 'Inventory VPC Networking', cmd: 'aws ec2 describe-vpcs --query "Vpcs[].{ID:VpcId,CIDR:CidrBlock,State:State}" --output table' },
          { step: 'List S3 Buckets', cmd: 'aws s3 ls' }
        ];
        discoverySteps.forEach(function (ds, i) {
          h += '<div class="runbook-step" style="margin-bottom:8px"><div class="runbook-step__header" role="button" tabindex="0" aria-expanded="true">';
          h += '<div class="runbook-step__number" style="background:var(--ts)">' + (i + 1) + '</div>';
          h += '<div class="runbook-step__title">' + esc(ds.step) + '</div>';
          h += '<span class="badge badge--customer"><span class="badge__dot"></span>Customer Action</span>';
          h += '<span class="runbook-step__chevron">\u25BC</span></div>';
          h += '<div class="runbook-step__body runbook-step__body--open">';
          h += '<div class="code-block"><div class="code-block__header"><span>bash</span><button class="code-block__copy" data-copy-target="disc-rp-' + i + '">Copy</button></div>';
          h += '<pre id="disc-rp-' + i + '"><code>' + esc(ds.cmd) + '</code></pre></div>';
          h += '</div></div>';
        });
        h += '</div></div>';

        // Partner link
        h += '<div style="margin-top:16px;display:flex;gap:8px;flex-wrap:wrap">';
        h += '<a href="' + partnerInfo.website + '" target="_blank" rel="noopener" class="btn btn--primary" style="font-size:13px;padding:8px 16px;text-decoration:none">\uD83C\uDF10 Contact Partner</a>';
        h += '</div>';

      } else {
        h += '<div class="callout callout--info">No partner selected. Go back and select a regional partner.</div>';
      }

      // Workload Discovery reference
      if (partnerInfo || drToolInfo) {
        h += '<div class="result-card" style="margin-top:16px;border-left:3px solid var(--gn)"><div class="result-card__header"><span class="result-card__title">\uD83D\uDD0D Additional Discovery Resources</span></div><div class="result-card__body">';
        h += '<p style="font-size:13px;color:var(--tl);margin-bottom:8px">For automated, managed resource discovery across accounts, consider AWS Workload Discovery on AWS.</p>';
        h += '<a href="https://aws.amazon.com/solutions/implementations/workload-discovery-on-aws/" target="_blank" rel="noopener" style="font-size:12px;color:var(--bll);text-decoration:none">\u2192 AWS Workload Discovery on AWS</a>';
        h += '</div></div>';
      }

      // Safety rails (always shown when a partner is selected)
      if (partnerInfo || drToolInfo) {
        h += '<div class="callout callout--warning" style="margin-top:16px"><strong>\u26A0 Safety Rails</strong><ul style="padding-left:20px;margin-top:8px">';
        h += '<li style="list-style:disc;margin-bottom:4px">Validate data residency and compliance requirements before any cross-region operations with a partner.</li>';
        h += '<li style="list-style:disc;margin-bottom:4px">Ensure partner has appropriate NDA and data handling agreements in place.</li>';
        h += '<li style="list-style:disc;margin-bottom:4px">Test DR procedures in non-production environment first if time permits.</li>';
        h += '<li style="list-style:disc;margin-bottom:4px">Document all actions taken for audit trail and post-engagement review.</li>';
        h += '<li style="list-style:disc;margin-bottom:4px">Verify service availability in target region — not all services and features are available in all regions.</li>';
        h += '<li style="list-style:disc;margin-bottom:4px">This tool provides general guidance only. Validate all steps with your security, compliance, and operations teams.</li>';
        h += '</ul></div>';
      }

      panel.innerHTML = h;
    }

  function renderMatchmakingResult(recommendation) {
    // Hide tabs — show single panel like Accelerated Recovery
    document.getElementById('results-tabs').style.display = 'none';
    document.getElementById('sidebar-results-links').style.display = 'none';

    // KPI
    var kpi = document.getElementById('kpi-grid');
    kpi.innerHTML = kpiCard('MODE', 'Partner Matchmaking', 'blue', 'Best-Fit Partner') +
      kpiCard('Partner', recommendation.partnerName || 'None', 'blue', '') +
      kpiCard('Confidence', recommendation.confidence || 'N/A', recommendation.confidence === 'High' ? 'green' : recommendation.confidence === 'Medium' ? 'orange' : 'red', 'Score: ' + (recommendation.score || 0) + '/100') +
      kpiCard('Steps', recommendation.executionPlan ? String(recommendation.executionPlan.length) : '0', 'orange', 'Execution steps');

    // Render into tab-summary (the only visible panel)
    var panel = document.getElementById('tab-summary');
    panel.classList.add('results-panel--active');
    var h = '';

    // Recommendation reasoning callout
    h += '<div class="callout callout--info" style="margin-bottom:20px"><strong>🎯 Partner Matchmaking — Recommendation</strong><br>' + esc(recommendation.reason || '') + '</div>';

    // AWS Resilience Partners callout
    h += '<div class="callout callout--success" style="margin-bottom:16px;font-size:12px">';
    h += '<strong>\uD83C\uDFC6 AWS Resilience Partners</strong><br>';
    h += 'These are MENA-region AWS partners with experience in resilience and migration workloads. Some partners hold verified <strong>AWS Competencies</strong> (e.g., AWS Resilience Competency, AWS Security Competency) — check individual partner profiles for details.';
    h += '<div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap">';
    h += '<a href="https://partners.amazonaws.com/search/partners?facets=Use%20Case%20%3A%20Resilience&loc=United%20Arab%20Emirates" target="_blank" rel="noopener" style="font-size:11px;color:var(--bll);text-decoration:none;padding:3px 10px;background:rgba(9,114,211,.06);border:1px solid rgba(9,114,211,.15);border-radius:4px;font-weight:600">\uD83C\uDDE6\uD83C\uDDEA UAE Partners</a>';
    h += '<a href="https://partners.amazonaws.com/search/partners?facets=Use%20Case%20%3A%20Resilience&loc=Saudi%20Arabia" target="_blank" rel="noopener" style="font-size:11px;color:var(--bll);text-decoration:none;padding:3px 10px;background:rgba(9,114,211,.06);border:1px solid rgba(9,114,211,.15);border-radius:4px;font-weight:600">\uD83C\uDDF8\uD83C\uDDE6 Saudi Arabia Partners</a>';
    h += '<a href="https://partners.amazonaws.com/search/partners?facets=Use%20Case%20%3A%20Resilience&loc=Bahrain" target="_blank" rel="noopener" style="font-size:11px;color:var(--bll);text-decoration:none;padding:3px 10px;background:rgba(9,114,211,.06);border:1px solid rgba(9,114,211,.15);border-radius:4px;font-weight:600">\uD83C\uDDE7\uD83C\uDDED Bahrain Partners</a>';
    h += '</div>';
    h += '<div style="margin-top:6px;font-size:11px;color:var(--ts)">Explore verified AWS Competency partners in your region via the AWS Partner Directory.</div>';
    h += '</div>';

    // Health-aware region advisory
    h += renderHealthRegionAdvisory();

    // Execution plan as runbook step cards
    if (recommendation.executionPlan && recommendation.executionPlan.length) {
      recommendation.executionPlan.forEach(function (s, i) {
        h += '<div class="runbook-step" style="margin-bottom:8px"><div class="runbook-step__header" role="button" tabindex="0" aria-expanded="true">';
        h += '<div class="runbook-step__number" style="background:var(--bll)">' + (i + 1) + '</div>';
        h += '<div class="runbook-step__title">' + esc(s.step) + '</div>';
        h += '<span class="runbook-step__chevron">\u25BC</span></div>';
        h += '<div class="runbook-step__body runbook-step__body--open">';
        h += '<p style="font-size:13px;color:var(--tl);margin-bottom:12px">' + escLink(s.detail) + '</p>';
        if (s.cmd) {
          h += '<div class="code-block"><div class="code-block__header"><span>bash</span><button class="code-block__copy" data-copy-target="mm-cmd-' + i + '">Copy</button></div>';
          h += '<pre id="mm-cmd-' + i + '"><code>' + esc(s.cmd) + '</code></pre></div>';
        }
        if (s.validation && s.validation.length) {
          h += '<div style="margin-top:8px;font-size:12px;color:var(--ts)"><strong>Validation Checks:</strong><ul style="padding-left:16px;margin-top:4px">';
          s.validation.forEach(function (v) { h += '<li style="list-style:disc;margin-bottom:2px">' + esc(v) + '</li>'; });
          h += '</ul></div>';
        }
        h += '</div></div>';
      });
    }

    // Safety rails
    h += '<div class="callout callout--warning" style="margin-top:16px"><strong>\u26A0 Safety Rails</strong><ul style="padding-left:20px;margin-top:8px">';
    h += '<li style="list-style:disc;margin-bottom:4px">Validate data residency and compliance requirements before any cross-region operations with a partner.</li>';
    h += '<li style="list-style:disc;margin-bottom:4px">Ensure partner has appropriate NDA and data handling agreements in place.</li>';
    h += '<li style="list-style:disc;margin-bottom:4px">Test DR procedures in non-production environment first if time permits.</li>';
    h += '<li style="list-style:disc;margin-bottom:4px">Document all actions taken for audit trail and post-engagement review.</li>';
    h += '<li style="list-style:disc;margin-bottom:4px">Verify service availability in target region — not all services and features are available in all regions.</li>';
    h += '<li style="list-style:disc;margin-bottom:4px">This tool provides general guidance only. Validate all steps with your security, compliance, and operations teams.</li>';
    h += '</ul></div>';

    // Partner links — check REGIONAL_PARTNERS first, then panic-partner partnerDetails for DR partners
    var partnerKey = recommendation.partner;
    var partnerWebsite = null;
    var partnerMarketplace = null;
    if (REGIONAL_PARTNERS[partnerKey]) {
      partnerWebsite = REGIONAL_PARTNERS[partnerKey].website;
      partnerMarketplace = REGIONAL_PARTNERS[partnerKey].marketplace;
    } else {
      var panicStep = WIZARD_STEPS.find(function (s) { return s.id === 'panic-partner'; });
      if (panicStep && panicStep.partnerDetails && panicStep.partnerDetails[partnerKey]) {
        partnerWebsite = panicStep.partnerDetails[partnerKey].website;
        partnerMarketplace = panicStep.partnerDetails[partnerKey].marketplace;
      }
    }

    if (partnerWebsite || partnerMarketplace) {
      h += '<div style="margin-top:16px;display:flex;gap:8px;flex-wrap:wrap">';
      if (partnerWebsite) {
        h += '<a href="' + partnerWebsite + '" target="_blank" rel="noopener" class="btn btn--primary" style="font-size:13px;padding:8px 16px;text-decoration:none">\uD83C\uDF10 Partner Website</a>';
      }
      if (partnerMarketplace) {
        h += '<a href="' + partnerMarketplace + '" target="_blank" rel="noopener" class="btn btn--secondary" style="font-size:13px;padding:8px 16px;text-decoration:none">\uD83D\uDED2 AWS Marketplace</a>';
      }
      h += '</div>';
    }

    panel.innerHTML = h;
  }

  // ============================================================
  // Results Rendering
  // ============================================================
  function showResults() {
    wizardSection.style.display = 'none';
    resultsSection.classList.add('results--visible');
    var badge = document.getElementById('topnav-badge');
    var isPanic = state.urgencyMode === 'immediate-dr';
    badge.textContent = isPanic ? '\uD83D\uDEA8 ACCELERATED RECOVERY' : 'Results';
    badge.className = 'topnav__badge topnav__badge--results';
    document.getElementById('sidebar-results-section').style.display = '';
    document.getElementById('sidebar-results-links').style.display = '';

    // Hide "Copy as Shell Script" button in non-architecture-strategy modes
    var scriptBtn = document.getElementById('btn-copy-script');
    if (scriptBtn) scriptBtn.style.display = (state.urgencyMode === 'architecture-strategy') ? '' : 'none';

    // ============================================================
    // ACCELERATED RECOVERY — Partner-only results
    // ============================================================
    if (isPanic) {
      var partnerStep = WIZARD_STEPS.find(function (s) { return s.id === 'panic-partner'; });
      var selectedPartner = state.panicPartner;
      var partnerInfo = partnerStep && partnerStep.partnerDetails && selectedPartner ? partnerStep.partnerDetails[selectedPartner] : null;

      // Hide tabs — show single panel
      document.getElementById('results-tabs').style.display = 'none';
      document.getElementById('sidebar-results-links').style.display = 'none';

      // KPI
      var kpi = document.getElementById('kpi-grid');
      kpi.innerHTML = kpiCard('MODE', 'ACCELERATED RECOVERY', 'red', 'Partner-Assisted Recovery') +
        kpiCard('Partner', partnerInfo ? partnerInfo.fullName : 'None', 'blue', '') +
        kpiCard('Steps', partnerInfo ? String(partnerInfo.immediateSteps.length) : '0', 'orange', 'Execution steps') +
        kpiCard('Action', 'EXECUTE NOW', 'red', 'Follow steps below');

      // Render partner steps into tab-summary (the only visible panel)
      var panel = document.getElementById('tab-summary');
      panel.classList.add('results-panel--active');
      var h = '';
      h += '<div class="callout callout--warning" style="margin-bottom:20px"><strong>\uD83D\uDEA8 ACCELERATED RECOVERY — Execution Plan</strong><br>Follow the steps below in order. Each step includes commands you can copy and execute.</div>';
      // Health-aware region advisory
      h += renderHealthRegionAdvisory();

      // AWS Environment Preparation — lightweight advisory before partner steps
      h += '<div class="callout callout--info" style="margin-bottom:16px">';
      h += '<strong>🔧 AWS Environment Preparation (Quick Checks)</strong>';
      h += '<p style="font-size:12px;color:var(--tl);margin:8px 0 4px">Complete these checks before executing partner recovery steps:</p>';
      h += '<ul style="padding-left:20px;font-size:12px;margin:0">';
      h += '<li style="list-style:disc;margin-bottom:4px"><strong>Confirm AWS service health</strong> — Check the <a href="https://health.aws.amazon.com/health/home" target="_blank" rel="noopener" style="color:var(--bll)">AWS Health Dashboard</a> for the affected and target regions.</li>';
      h += '<li style="list-style:disc;margin-bottom:4px"><strong>Ensure destination region is enabled</strong> — Opt-in regions must be enabled: <code>aws account get-region-opt-status --region-name &lt;TARGET_REGION&gt;</code></li>';
      h += '<li style="list-style:disc;margin-bottom:4px"><strong>Validate service quotas</strong> — Confirm required quotas (EC2, EBS, ENIs) exist in the destination region.</li>';
      h += '<li style="list-style:disc;margin-bottom:4px"><strong>Confirm IAM and KMS readiness</strong> — Ensure required roles, policies, and encryption keys are available in the target region.</li>';
      h += '<li style="list-style:disc;margin-bottom:4px"><strong>Verify network readiness</strong> — Confirm VPC connectivity, VPN/DX, and routing to the recovery region.</li>';
      h += '<li style="list-style:disc;margin-bottom:4px"><strong>Validate DNS failover readiness</strong> — Confirm Route 53 health checks and failover records are configured.</li>';
      h += '</ul></div>';

      if (partnerInfo) {
        h += '<div class="result-card" style="border-left:3px solid var(--or);margin-bottom:20px"><div class="result-card__header">';
        h += '<span class="result-card__title">' + esc(partnerInfo.fullName) + '</span>';
        h += '<a href="' + partnerInfo.marketplace + '" target="_blank" rel="noopener" style="font-size:12px;color:var(--bll);text-decoration:none;padding:4px 12px;background:rgba(9,114,211,.08);border-radius:4px">AWS Marketplace \u2192</a>';
        h += '</div><div class="result-card__body">';
        h += '<p style="font-size:13px;color:var(--tl);margin-bottom:8px"><strong>Focus:</strong> ' + esc(partnerInfo.focus) + '</p>';
        h += '<p style="font-size:13px;color:var(--tl);margin-bottom:16px"><strong>Approach:</strong> ' + esc(partnerInfo.approach) + '</p>';

        // Immediate steps as runbook cards
        partnerInfo.immediateSteps.forEach(function (s, i) {
          h += '<div class="runbook-step" style="margin-bottom:8px"><div class="runbook-step__header" role="button" tabindex="0" aria-expanded="true">';
          h += '<div class="runbook-step__number" style="background:var(--or)">' + (i + 1) + '</div>';
          h += '<div class="runbook-step__title">' + esc(s.step) + '</div>';
          h += '<span class="runbook-step__chevron">\u25BC</span></div>';
          h += '<div class="runbook-step__body runbook-step__body--open">';
          h += '<p style="font-size:13px;color:var(--tl);margin-bottom:12px">' + escLink(s.detail) + '</p>';
          if (s.cmd) {
            h += '<div class="code-block"><div class="code-block__header"><span>bash</span><button class="code-block__copy" data-copy-target="panic-cmd-' + i + '">Copy</button></div>';
            h += '<pre id="panic-cmd-' + i + '"><code>' + esc(s.cmd) + '</code></pre></div>';
          }
          h += '</div></div>';
        });

        // Safety rails
        h += '<div class="callout callout--warning" style="margin-top:16px"><strong>\u26A0 Safety Rails</strong><ul style="padding-left:20px;margin-top:8px">';
        h += '<li style="list-style:disc;margin-bottom:4px">Data loss risk: partner tool may not cover all data stores. Pair with AWS Backup or native snapshots.</li>';
        h += '<li style="list-style:disc;margin-bottom:4px">Compliance: validate data residency requirements before moving to target region.</li>';
        h += '<li style="list-style:disc;margin-bottom:4px">Test in non-production first if time permits.</li>';
        h += '<li style="list-style:disc;margin-bottom:4px">Document all actions taken for post-incident review.</li>';
        h += '<li style="list-style:disc;margin-bottom:4px">Verify service availability in target region — not all services and features are available in all regions.</li>';
        h += '<li style="list-style:disc;margin-bottom:4px">This tool provides general guidance only. Validate all steps with your security, compliance, and operations teams before execution.</li>';
        h += '</ul></div>';

        // Links
        h += '<div style="margin-top:16px;display:flex;gap:8px;flex-wrap:wrap">';
        h += '<a href="' + partnerInfo.marketplace + '" target="_blank" rel="noopener" class="btn btn--primary" style="font-size:13px;padding:8px 16px;text-decoration:none">\uD83D\uDED2 Get on AWS Marketplace</a>';
        h += '<a href="' + partnerInfo.website + '" target="_blank" rel="noopener" class="btn btn--secondary" style="font-size:13px;padding:8px 16px;text-decoration:none">\uD83C\uDF10 Partner Website</a>';
        h += '</div>';

        h += '</div></div>';
      } else {
        h += '<div class="callout callout--info">No partner selected. Go back and select a DR acceleration partner.</div>';
      }

      panel.innerHTML = h;
      wireRunbookToggles(panel);
      wireCopyButtons();
      renderSidebar();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return; // EXIT — don't render normal assessment results
    }

    // ============================================================
    // REGIONAL PARTNER MODE — Partner engagement guide
    // ============================================================
    if (state.urgencyMode === 'regional-partner') {
      badge.textContent = '🤝 Regional Partner';
      // Hide sidebar results section entirely for partner mode
      document.getElementById('sidebar-results-section').style.display = 'none';
      document.getElementById('sidebar-results-links').style.display = 'none';
      // Clear all tab panels to prevent strategy runbook from leaking into partner view
      ['tab-summary','tab-runbook','tab-commands','tab-waves','tab-trace','tab-risks','tab-reference'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) { el.classList.remove('results-panel--active'); el.innerHTML = ''; }
      });
      renderPartnerEngagementGuide();
      var rpPanel = document.getElementById('tab-summary');
      wireRunbookToggles(rpPanel);
      wireCopyButtons();
      renderSidebar();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return; // EXIT — don't render normal assessment results
    }

    // ============================================================
    // MATCHMAKING MODE — Partner recommendation results
    // ============================================================
    if (state.urgencyMode === 'matchmaking') {
      badge.textContent = '🎯 Partner Matchmaking';
      // Hide sidebar results section entirely for matchmaking mode
      document.getElementById('sidebar-results-section').style.display = 'none';
      document.getElementById('sidebar-results-links').style.display = 'none';
      // Clear all tab panels to prevent strategy runbook from leaking into matchmaking view
      ['tab-summary','tab-runbook','tab-commands','tab-waves','tab-trace','tab-risks','tab-reference'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) { el.classList.remove('results-panel--active'); el.innerHTML = ''; }
      });
      document.getElementById('results-tabs').style.display = 'none';
      var recommendation = MATCHMAKING_ENGINE.recommend(state);
      renderMatchmakingResult(recommendation);
      var mmPanel = document.getElementById('tab-summary');
      wireRunbookToggles(mmPanel);
      wireCopyButtons();
      renderSidebar();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return; // EXIT — don't render normal assessment results
    }

    // ============================================================
    // ARCHITECTURE STRATEGY — Full assessment results
    // ============================================================
    // Safety guard: only architecture-strategy mode should reach here
    if (state.urgencyMode !== 'architecture-strategy') {
      var panel = document.getElementById('tab-summary');
      panel.classList.add('results-panel--active');
      panel.innerHTML = '<div class="callout callout--warning">Unexpected mode: ' + esc(state.urgencyMode || 'none') + '. Please restart the assessment.</div>';
      document.getElementById('results-tabs').style.display = 'none';
      renderSidebar();
      return;
    }
    document.getElementById('results-tabs').style.display = '';

    var arch = RULES_ENGINE.getArchitecture(state);
    var complexity = RULES_ENGINE.getComplexity(state);
    var timeline = RULES_ENGINE.getTimeline(state);
    var risk = RULES_ENGINE.getRiskLevel(state);
    var actions = RULES_ENGINE.getActions(state);
    var waves = RULES_ENGINE.getWaves(state);
    var risks = RULES_ENGINE.getRisks(state);
    var runbook = RULES_ENGINE.getRunbookSteps(state);
    var cmdBlocks = RULES_ENGINE.getCommandBlocks(state);
    var refLib = RULES_ENGINE.getReferenceLibrary();
    var archLabels = { 'active-active': 'Active/Active', 'warm-standby': 'Warm Standby', 'pilot-light': 'Pilot Light', 'backup-restore': 'Backup/Restore' };

    // KPI
    var kpi = document.getElementById('kpi-grid');
    kpi.innerHTML = kpiCard('Architecture', archLabels[arch] || arch, 'blue', '') +
      kpiCard('Complexity', complexity.level, complexity.cls === 'low' ? 'green' : complexity.cls === 'medium' ? 'orange' : 'red', complexity.score + '%') +
      kpiCard('Timeline', timeline.weeks + ' wk', 'blue', timeline.label) +
      kpiCard('Risk', risk.level, risk.cls === 'low' ? 'green' : risk.cls === 'moderate' ? 'orange' : 'red', actions.length + ' actions');
    if (isPanic) kpi.innerHTML += kpiCard('MODE', 'ACCELERATED RECOVERY', 'red', 'Accelerated Recovery');

    // Tab: Summary
    renderSummaryTab(arch, archLabels, complexity, risk, actions, isPanic);
    // Tab: Runbook
    renderRunbookTab(runbook, isPanic);
    // Tab: Commands
    renderCommandsTab(cmdBlocks);
    // Tab: Waves
    renderWavesTab(waves);
    // Tab: Trace
    renderTraceTab(isPanic);
    // Tab: Risks
    renderRisksTab(risks, isPanic);
    // Tab: Reference
    renderReferenceTab(refLib, isPanic);

    wireTabSwitching();
    switchTab('tab-summary');
    renderSidebar();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function kpiCard(l, v, c, s) {
    return '<div class="kpi-card"><div class="kpi-card__label">' + esc(l) + '</div><div class="kpi-card__value kpi-card__value--' + c + '">' + esc(v) + '</div><div class="kpi-card__sub">' + esc(s) + '</div></div>';
  }

  function renderSummaryTab(arch, archLabels, complexity, risk, actions, isPanic) {
    var p = document.getElementById('tab-summary'); if (!p) return;
    var h = '';
    if (isPanic) h += '<div class="callout callout--warning"><strong>🚨 ACCELERATED RECOVERY</strong> — This plan prioritizes fastest viable recovery. Elevated risk of data loss. Validate compliance requirements.</div>';
    // Health-aware region advisory
    h += renderHealthRegionAdvisory();
    // Summary grid
    h += '<div class="result-card"><div class="result-card__header"><span class="result-card__title">Strategy Summary</span></div><div class="result-card__body"><div class="summary-grid">';
    WIZARD_STEPS.forEach(function (step) {
      if (step.multiSelect) {
        var arr = state[step.stateKey] || [];
        if (arr.length) h += '<div class="summary-item"><div class="summary-item__label">' + esc(step.title) + '</div><div class="summary-item__value">' + arr.map(function (v) { var o = step.options.find(function (x) { return x.value === v; }); return o ? esc(o.label) : esc(v); }).join(', ') + '</div></div>';
      } else {
        var val = state[step.stateKey]; var opt = step.options ? step.options.find(function (o) { return o.value === val; }) : null;
        if (opt) h += '<div class="summary-item"><div class="summary-item__label">' + esc(step.title) + '</div><div class="summary-item__value">' + esc(opt.label) + '</div></div>';
      }
    });
    h += '</div>';
    // Meters
    h += '<div style="margin-top:16px"><div style="font-size:13px;font-weight:600;color:var(--tl);margin-bottom:8px">Complexity</div><div class="meter"><div class="meter__bar"><div class="meter__fill meter__fill--' + complexity.cls + '" style="width:' + complexity.score + '%"></div></div><div class="meter__label" style="color:var(--' + (complexity.cls === 'low' ? 'gr' : complexity.cls === 'medium' ? 'or' : 'rd') + ')">' + complexity.level + '</div></div></div>';
    h += '<div style="margin-top:8px"><div style="font-size:13px;font-weight:600;color:var(--tl);margin-bottom:8px">Risk</div><div class="risk-indicator risk-indicator--' + risk.cls + '">' + risk.level + '</div></div>';
    h += '</div></div>';
    // Architecture
    h += '<div class="result-card"><div class="result-card__header"><span class="result-card__title">Architecture</span><span class="badge badge--blue"><span class="badge__dot"></span>' + esc(archLabels[arch] || arch) + '</span></div><div class="result-card__body"><div class="arch-diagram">' + generateArchSvg(arch) + '</div><div style="margin-top:8px;font-size:11px;color:var(--ts)">Based on <a href="https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/disaster-recovery-options-in-the-cloud.html" target="_blank" rel="noopener" style="color:var(--bll)">AWS DR Whitepaper — Disaster Recovery Options in the Cloud</a></div></div></div>';
    // Actions
    h += '<div class="result-card"><div class="result-card__header"><span class="result-card__title">Actions (' + actions.length + ')</span></div><div class="result-card__body"><div class="checklist">';
    actions.forEach(function (a) { h += '<div class="checklist__item"><span class="checklist__icon">\u2610</span><span>' + esc(a.text) + '</span><span class="checklist__tag checklist__tag--' + a.tag.toLowerCase() + '">' + a.tag + '</span></div>'; });
    h += '</div></div></div>';

    // Cost Estimate
    var costEst = RULES_ENGINE.getCostEstimate(state);
    h += '<div class="result-card"><div class="result-card__header"><span class="result-card__title">💰 Estimated Monthly Cost (Target Region)</span><span class="badge badge--orange"><span class="badge__dot"></span>~$' + costEst.monthly.toLocaleString() + '/mo</span></div><div class="result-card__body">';
    h += '<div class="callout callout--info" style="margin-bottom:12px;font-size:12px"><strong>Disclaimer:</strong> These are rough directional estimates only. Actual costs depend on instance types, data transfer volumes, usage patterns, reserved capacity, and savings plans. Use the <a href="https://calculator.aws/" target="_blank" rel="noopener" style="color:var(--bll)">AWS Pricing Calculator</a> for accurate estimates.</div>';
    h += '<table style="width:100%"><thead><tr><th>Component</th><th>Est. Monthly</th><th>Notes</th></tr></thead><tbody>';
    costEst.items.forEach(function (item) {
      h += '<tr><td>' + esc(item.name) + '</td><td style="color:var(--or);font-weight:600">~$' + item.cost.toLocaleString() + '</td><td style="font-size:12px;color:var(--ts)">' + esc(item.note) + '</td></tr>';
    });
    h += '</tbody></table>';
    h += '<div style="margin-top:8px;font-size:12px;color:var(--ts)">Total estimate: ~$' + costEst.monthly.toLocaleString() + '/month. Does not include data transfer costs, which can be significant for cross-region replication.</div>';
    h += '</div></div>';

    // DB Method Availability Summary (when stateful DB workloads selected)
    var dbTypesSelected = state.dbTypes || [];
    var hasDbWorkloads = dbTypesSelected.length > 0 && dbTypesSelected[0] !== 'none';
    if (hasDbWorkloads && !isPanic) {
      var s3status = state.sourceS3Availability || 'unknown';
      var s3Label = s3status === 'available' ? '✅ S3 Available' : s3status === 'impaired' ? '🔴 S3 Impaired' : '❓ S3 Unknown';
      h += '<div class="result-card"><div class="result-card__header"><span class="result-card__title">🗄️ Database Migration Method Availability</span><span class="badge ' + (s3status === 'impaired' ? 'badge--red' : s3status === 'available' ? 'badge--green' : 'badge--orange') + '"><span class="badge__dot"></span>' + s3Label + '</span></div><div class="result-card__body">';
      if (s3status === 'impaired') {
        h += '<div class="callout callout--warning" style="margin-bottom:12px;font-size:12px"><strong>⚠ S3 Impairment Active:</strong> Snapshot-based methods (snapshot copy, S3-based export/import, cross-region automated backups) are unavailable while S3 is impaired in the source region. Use non-S3-dependent methods below.</div>';
      } else if (s3status === 'unknown') {
        h += '<div class="callout callout--info" style="margin-bottom:12px;font-size:12px"><strong>❓ S3 Status Unknown:</strong> Verify S3 availability via the <a href="https://health.aws.amazon.com/health/status" target="_blank" rel="noopener" style="color:var(--bll)">AWS Health Dashboard</a> before relying on snapshot-based methods.</div>';
      }
      var yesCell = '<span style="color:var(--gr);font-weight:600">✅ Yes</span>';
      var noCell = '<span style="color:#e74c3c;font-weight:600">❌ No</span>';
      var cautionCell = '<span style="color:var(--or);font-weight:600">⚠ Verify</span>';
      var s3Yes = s3status === 'available' ? yesCell : s3status === 'impaired' ? noCell : cautionCell;
      h += '<table style="width:100%;font-size:12px"><thead><tr><th>Method</th><th>Available During S3 Impairment?</th><th>Notes</th></tr></thead><tbody>';
      h += '<tr><td>Cross-region read replica promotion</td><td>' + yesCell + '</td><td>Does not depend on S3. Preferred fast-path for RDS/Aurora.</td></tr>';
      h += '<tr><td>Aurora Global Database failover</td><td>' + yesCell + '</td><td>Managed failover/detach. Independent of S3.</td></tr>';
      h += '<tr><td>Cross-region automated backup</td><td>' + s3Yes + '</td><td>Depends on S3 for backup storage and cross-region copy.</td></tr>';
      h += '<tr><td>RDS/Aurora snapshot copy to another region</td><td>' + s3Yes + '</td><td>Snapshot copy uses S3 internally. Unavailable during S3 impairment.</td></tr>';
      h += '<tr><td>pg_dump / pg_restore (PostgreSQL)</td><td>' + yesCell + '</td><td>Direct logical export via network. No S3 dependency.</td></tr>';
      h += '<tr><td>mysqldump (MySQL/MariaDB)</td><td>' + yesCell + '</td><td>Direct logical export via network. No S3 dependency.</td></tr>';
      h += '<tr><td>mydumper / myloader (MySQL/MariaDB)</td><td>' + yesCell + '</td><td>Parallel logical export. No S3 dependency. Good for large datasets.</td></tr>';
      h += '<tr><td>Oracle Data Pump via DB link</td><td>' + yesCell + '</td><td>Network-based transfer. No S3 dependency.</td></tr>';
      h += '<tr><td>Oracle Data Pump via jump server</td><td>' + yesCell + '</td><td>Uses DBMS_FILE_TRANSFER. No S3 dependency.</td></tr>';
      h += '<tr><td>Oracle Data Pump via S3 staging</td><td>' + s3Yes + '</td><td>Requires S3 for staging. Only when S3 is available.</td></tr>';
      h += '<tr><td>BCP for SQL Server</td><td>' + yesCell + '</td><td>Table-level export via network. No S3 dependency.</td></tr>';
      h += '<tr><td>SQL Server native backup/restore via S3</td><td>' + s3Yes + '</td><td>Uses S3 for backup storage. Only when S3 is available.</td></tr>';
      h += '<tr><td>AWS DMS</td><td>' + yesCell + '</td><td>Network-based replication. No S3 dependency for core replication.</td></tr>';
      h += '</tbody></table>';
      h += '</div></div>';
    }

    // Compliance & Target Region Guidance
    if (state.compliance && state.compliance !== 'none') {
      var compRegions = RULES_ENGINE.getComplianceRegions(state.compliance);
      h += '<div class="result-card"><div class="result-card__header"><span class="result-card__title">🏛 Target Regions for Compliance Review</span></div><div class="result-card__body">';
      if (compRegions.note) h += '<p style="font-size:13px;color:var(--tl);margin-bottom:12px">' + esc(compRegions.note) + '</p>';
      if (compRegions.eu) { h += '<div style="font-size:12px;font-weight:600;color:var(--bll);margin-bottom:4px">EU Regions</div><p style="font-size:12px;color:var(--tl);margin-bottom:8px">' + compRegions.eu.join(' · ') + '</p>'; }
      if (compRegions.mena) { h += '<div style="font-size:12px;font-weight:600;color:var(--bll);margin-bottom:4px">MENA Regions</div><p style="font-size:12px;color:var(--tl);margin-bottom:8px">' + compRegions.mena.join(' · ') + '</p>'; }
      if (compRegions.apac) { h += '<div style="font-size:12px;font-weight:600;color:var(--bll);margin-bottom:4px">APAC Regions</div><p style="font-size:12px;color:var(--tl);margin-bottom:8px">' + compRegions.apac.join(' · ') + '</p>'; }
      if (compRegions.govcloud) { h += '<div style="font-size:12px;font-weight:600;color:var(--bll);margin-bottom:4px">GovCloud</div><p style="font-size:12px;color:var(--tl);margin-bottom:8px">' + compRegions.govcloud.join(' · ') + '</p>'; }
      if (compRegions.regions) { h += '<p style="font-size:12px;color:var(--tl)">' + compRegions.regions.join(' · ') + '</p>'; }
      h += '<div style="margin-top:8px;font-size:11px;color:var(--ts)">Verify current compliance status: <a href="https://aws.amazon.com/compliance/services-in-scope/" target="_blank" rel="noopener" style="color:var(--bll)">AWS Compliance Services in Scope</a> | <a href="https://aws.amazon.com/about-aws/global-infrastructure/regional-product-services/" target="_blank" rel="noopener" style="color:var(--bll)">Regional Service Availability</a></div>';
      h += '</div></div>';
    }

    p.innerHTML = h;
  }

  function renderRunbookTab(runbook, isPanic) {
    var p = document.getElementById('tab-runbook'); if (!p) return;
    var h = '<h3 style="color:#fff;font-size:16px;margin-bottom:4px">' + (isPanic ? '🚨 Emergency Runbook' : 'Migration Runbook') + '</h3>';
    h += '<div style="font-size:13px;color:var(--ts);margin-bottom:16px">' + runbook.length + ' steps — execute sequentially</div>';

    // Decision checkpoint
    h += '<div class="callout callout--info" style="margin-bottom:16px"><strong>Before initiating recovery actions, validate:</strong><ul style="padding-left:20px;margin-top:6px;font-size:12px"><li style="list-style:disc;margin-bottom:4px">The workload is impacted at the business level</li><li style="list-style:disc;margin-bottom:4px">Observability confirms the scope of impact</li><li style="list-style:disc;margin-bottom:4px">The issue scope (service, AZ, or broader) is understood</li></ul></div>';

    // Safety disclaimer
    h += '<div class="callout callout--warning" style="margin-bottom:16px;font-size:12px"><strong>⚠ Safety:</strong> Validate service availability and permissions before executing recovery steps. Runbooks should be tested prior to production use. Replace all &lt;PLACEHOLDER&gt; values before execution.</div>';

    // Pre-flight checklist
    h += '<div class="preflight-card"><div class="preflight-card__title">Pre-flight Checklist</div>';
    h += '<div class="preflight-card__list">';
    h += '<div class="preflight-card__item">AWS account access confirmed</div>';
    h += '<div class="preflight-card__item">Target region identified</div>';
    h += '<div class="preflight-card__item">IAM permissions verified</div>';
    h += '<div class="preflight-card__item">Service quotas reviewed</div>';
    if (isPanic) {
      h += '<div class="preflight-card__item">Incident declared & authority confirmed</div>';
      h += '<div class="preflight-card__item">Communication channels established</div>';
    } else {
      h += '<div class="preflight-card__item">Change management approved</div>';
      h += '<div class="preflight-card__item">Rollback plan documented</div>';
    }
    h += '</div></div>';

    // Stepper container with flow arrows
    h += '<div class="runbook-stepper">';
    runbook.forEach(function (step, i) {
      var oCls = step.owner === 'Customer' ? 'blue' : 'orange';
      var cCls = step.complexity === 'Low' ? 'green' : step.complexity === 'Medium' ? 'orange' : 'red';
      h += '<div class="runbook-step"><div class="runbook-step__header" role="button" tabindex="0" aria-expanded="false">';
      h += '<div class="runbook-step__number">' + (i + 1) + '</div>';
      h += '<div style="flex:1"><div class="runbook-step__title">' + esc(step.title) + '</div>';
      // Dependency chips
      if (step.prereqs && step.prereqs.length) {
        h += '<div class="runbook-step__deps">';
        step.prereqs.forEach(function (pr) { h += '<span class="runbook-step__dep-chip">' + esc(pr) + '</span>'; });
        h += '</div>';
      }
      h += '</div>';
      h += '<span class="badge badge--' + oCls + '"><span class="badge__dot"></span>' + esc(step.owner) + '</span>';
      h += '<span class="badge badge--' + cCls + '" style="margin-left:6px"><span class="badge__dot"></span>' + esc(step.complexity) + '</span>';
      h += '<span class="runbook-step__chevron">\u25B6</span></div>';
      h += '<div class="runbook-step__body">';
      h += '<div class="runbook-step__desc">' + esc(step.description) + '</div>';
      if (step.refs && step.refs.length) { h += '<div class="runbook-step__section" style="margin-top:8px"><div class="runbook-step__section-title">📚 References</div><ul class="runbook-step__list" style="font-size:12px">'; step.refs.forEach(function (ref) { h += '<li><a href="' + esc(ref.url) + '" target="_blank" rel="noopener" style="color:var(--bll)">' + esc(ref.label) + '</a></li>'; }); h += '</ul></div>'; }
      if (step.prereqs && step.prereqs.length) { h += '<div class="runbook-step__section"><div class="runbook-step__section-title">Prerequisites</div><ul class="runbook-step__list">'; step.prereqs.forEach(function (p) { h += '<li>' + esc(p) + '</li>'; }); h += '</ul></div>'; }
      if (step.commands && step.commands.length) { h += '<div class="runbook-step__section"><div class="runbook-step__section-title">Commands</div><div class="code-block"><div class="code-block__header"><span>bash</span><button class="code-block__copy" data-copy-target="rb-' + i + '">Copy</button></div><pre id="rb-' + i + '"><code>'; step.commands.forEach(function (c) { h += esc(c) + '\n'; }); h += '</code></pre></div></div>'; }
      if (step.validation && step.validation.length) { h += '<div class="runbook-step__section"><div class="runbook-step__section-title">Validation</div><ul class="runbook-step__list runbook-step__list--check">'; step.validation.forEach(function (v) { h += '<li>\u2713 ' + escLink(v) + '</li>'; }); h += '</ul></div>'; }
      if (step.rollback) h += '<div class="runbook-step__section"><div class="runbook-step__section-title">Rollback</div><div class="callout callout--warning">' + escLink(step.rollback) + '</div></div>';
      h += '</div></div>';
    });
    h += '</div>'; // close runbook-stepper
    // Selected partner card (immediate-dr mode)
    if (isPanic) {
      var partnerStep = WIZARD_STEPS.find(function (s) { return s.id === 'panic-partner'; });
      var selectedPartner = state.panicPartner;
      var partnerInfo = partnerStep && partnerStep.partnerDetails && selectedPartner ? partnerStep.partnerDetails[selectedPartner] : null;

      if (partnerInfo) {
        h += '<div class="result-card" style="margin-top:16px;border-left:3px solid var(--or)"><div class="result-card__header"><span class="result-card__title">\uD83E\uDD1D ' + esc(partnerInfo.fullName) + ' — Accelerated Recovery Steps</span>';
        h += '<a href="' + partnerInfo.marketplace + '" target="_blank" rel="noopener" style="font-size:12px;color:var(--bll);text-decoration:none;padding:4px 10px;background:rgba(9,114,211,.08);border-radius:4px">AWS Marketplace \u2192</a>';
        h += '</div><div class="result-card__body">';
        h += '<p style="font-size:13px;color:var(--tl);margin-bottom:16px"><strong>Focus:</strong> ' + esc(partnerInfo.focus) + ' | <strong>Approach:</strong> ' + esc(partnerInfo.approach) + '</p>';

        // Immediate execution steps
        partnerInfo.immediateSteps.forEach(function (s, i) {
          h += '<div class="runbook-step" style="margin-bottom:8px"><div class="runbook-step__header" role="button" tabindex="0" aria-expanded="false">';
          h += '<div class="runbook-step__number" style="background:var(--or)">' + (i + 1) + '</div>';
          h += '<div class="runbook-step__title">' + esc(s.step) + '</div>';
          h += '<span class="runbook-step__chevron">\u25B6</span></div>';
          h += '<div class="runbook-step__body">';
          h += '<p style="font-size:13px;color:var(--tl);margin-bottom:12px">' + escLink(s.detail) + '</p>';
          if (s.cmd) {
            h += '<div class="code-block"><div class="code-block__header"><span>bash</span><button class="code-block__copy" data-copy-target="partner-cmd-' + i + '">Copy</button></div>';
            h += '<pre id="partner-cmd-' + i + '"><code>' + esc(s.cmd) + '</code></pre></div>';
          }
          h += '</div></div>';
        });

        // Links
        h += '<div style="margin-top:16px;display:flex;gap:8px;flex-wrap:wrap">';
        h += '<a href="' + partnerInfo.marketplace + '" target="_blank" rel="noopener" class="btn btn--primary" style="font-size:12px;padding:6px 14px;text-decoration:none">AWS Marketplace</a>';
        h += '<a href="' + partnerInfo.website + '" target="_blank" rel="noopener" class="btn btn--secondary" style="font-size:12px;padding:6px 14px;text-decoration:none">Website</a>';
        h += '</div>';
        h += '</div></div>';
      } else {
        // Fallback: show generic ControlMonkey card if no partner selected
        var cm = RULES_ENGINE.getControlMonkeyCard();
        h += '<div class="result-card" style="margin-top:16px;border-left:3px solid var(--or)"><div class="result-card__header"><span class="result-card__title">\uD83E\uDD1D ' + esc(cm.title) + '</span></div><div class="result-card__body">';
        h += '<p style="font-size:13px;color:var(--tl);margin-bottom:12px">' + esc(cm.description) + '</p>';
        h += '<div style="font-size:13px;font-weight:600;color:var(--bll);margin-bottom:6px">Platform Capabilities</div><ul style="padding-left:20px;margin-bottom:12px">';
        cm.capabilities.forEach(function (c) { h += '<li style="font-size:13px;color:var(--tl);margin-bottom:4px;list-style:disc">' + esc(c) + '</li>'; });
        h += '</ul></div></div>';
      }
    }
    // Workload Discovery reference
    h += '<div class="result-card" style="margin-top:16px;border-left:3px solid var(--gn)"><div class="result-card__header"><span class="result-card__title">\uD83D\uDD0D Additional Discovery Resources</span></div><div class="result-card__body">';
    h += '<p style="font-size:13px;color:var(--tl);margin-bottom:8px">For automated, managed resource discovery across accounts, consider AWS Workload Discovery on AWS.</p>';
    h += '<a href="https://aws.amazon.com/solutions/implementations/workload-discovery-on-aws/" target="_blank" rel="noopener" style="font-size:12px;color:var(--bll);text-decoration:none">\u2192 AWS Workload Discovery on AWS</a>';
    h += '</div></div>';
    p.innerHTML = h;
    wireRunbookToggles(p);
  }

  function wireRunbookToggles(panel) {
    panel.querySelectorAll('.runbook-step__header').forEach(function (hdr) {
      hdr.addEventListener('click', function () { toggleRunbook(hdr); });
      hdr.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleRunbook(hdr); } });
    });
  }
  function toggleRunbook(hdr) {
    var body = hdr.nextElementSibling, chev = hdr.querySelector('.runbook-step__chevron');
    var exp = hdr.getAttribute('aria-expanded') === 'true';
    if (exp) { body.classList.remove('runbook-step__body--open'); hdr.setAttribute('aria-expanded', 'false'); if (chev) chev.textContent = '\u25B6'; }
    else { body.classList.add('runbook-step__body--open'); hdr.setAttribute('aria-expanded', 'true'); if (chev) chev.textContent = '\u25BC'; }
  }

  function renderCommandsTab(blocks) {
    var p = document.getElementById('tab-commands'); if (!p) return;
    var h = '<h3 style="color:var(--tl);font-size:16px;margin-bottom:16px">CLI Commands (' + blocks.length + ' groups)</h3>';
    blocks.forEach(function (b, i) {
      h += '<div class="code-block" style="margin-bottom:16px"><div class="code-block__header"><span>' + esc(b.title) + '</span><button class="code-block__copy" data-copy-target="cb-' + i + '">Copy</button></div><pre id="cb-' + i + '"><code>' + esc(b.commands) + '</code></pre></div>';
    });
    p.innerHTML = h;
  }

  function renderWavesTab(waves) {
    var p = document.getElementById('tab-waves'); if (!p) return;
    var h = '<div class="wave-grid">';
    [['wave1', '1'], ['wave2', '2'], ['wave3', '3']].forEach(function (w) {
      var wave = waves[w[0]];
      h += '<div class="wave-card"><div class="wave-card__number wave-card__number--' + w[1] + '">Wave ' + w[1] + ' \u2014 ' + esc(wave.timeframe) + '</div>';
      h += '<div class="wave-card__title">' + esc(wave.title) + '</div>';
      h += '<ul class="wave-card__list">'; wave.items.forEach(function (item) { h += '<li>' + esc(item) + '</li>'; }); h += '</ul>';
      if (wave.validation) h += '<div style="margin-top:8px;font-size:12px;color:var(--gr)"><strong>Validation:</strong> ' + esc(wave.validation) + '</div>';
      if (wave.exitCriteria) h += '<div style="margin-top:4px;font-size:12px;color:var(--bll)"><strong>Exit Criteria:</strong> ' + esc(wave.exitCriteria) + '</div>';
      h += '</div>';
    });
    h += '</div>';
    h += '<div style="margin-top:20px">' + generateTimelineSvg(waves) + '</div>';
    p.innerHTML = h;
  }

  function renderTraceTab(isPanic) {
    var p = document.getElementById('tab-trace'); if (!p) return;
    var arch = RULES_ENGINE.getArchitecture(state), complexity = RULES_ENGINE.getComplexity(state);
    var archLabels = { 'active-active': 'Active/Active', 'warm-standby': 'Warm Standby', 'pilot-light': 'Pilot Light', 'backup-restore': 'Backup/Restore' };
    var h = '<h3 style="color:var(--tl);font-size:16px;margin-bottom:12px">Decision Trace</h3>';
    if (isPanic) h += '<div class="badge badge--red" style="margin-bottom:12px"><span class="badge__dot"></span>ACCELERATED RECOVERY</div>';
    h += '<table><thead><tr><th>Step</th><th>Selection</th><th>Weight</th><th>Impact</th></tr></thead><tbody>';
    WIZARD_STEPS.forEach(function (step) {
      if (step.multiSelect) {
        var arr = state[step.stateKey] || []; if (!arr.length) return;
        var labels = arr.map(function (v) { var o = step.options.find(function (x) { return x.value === v; }); return o ? o.label : v; });
        h += '<tr><td>' + esc(step.title) + '</td><td>' + esc(labels.join(', ')) + '</td><td>' + arr.length + ' selected</td><td><span class="badge badge--blue"><span class="badge__dot"></span>Multi</span></td></tr>';
      } else {
        var val = state[step.stateKey]; var opt = step.options ? step.options.find(function (o) { return o.value === val; }) : null;
        if (!opt) return;
        var maxW = Math.max.apply(null, step.options.map(function (o) { return o.weight; }));
        var pct = maxW > 0 ? Math.round((opt.weight / maxW) * 100) : 0;
        var impact = pct >= 70 ? 'High' : pct >= 40 ? 'Medium' : 'Low';
        var iCls = pct >= 70 ? 'red' : pct >= 40 ? 'orange' : 'green';
        h += '<tr><td>' + esc(step.title) + '</td><td>' + esc(opt.label) + '</td><td>' + opt.weight + '/' + maxW + '</td><td><span class="badge badge--' + iCls + '"><span class="badge__dot"></span>' + impact + '</span></td></tr>';
      }
    });
    h += '</tbody></table>';
    h += '<div style="margin-top:16px" class="summary-grid"><div class="summary-item"><div class="summary-item__label">Architecture</div><div class="summary-item__value">' + esc(archLabels[arch] || arch) + '</div></div><div class="summary-item"><div class="summary-item__label">Complexity</div><div class="summary-item__value">' + complexity.score + '% (' + complexity.level + ')</div></div></div>';

    // Step Inclusion Trace — explains why specific runbook steps were included
    if (!isPanic) {
      h += '<h3 style="color:var(--tl);font-size:16px;margin:20px 0 12px">Step Inclusion Trace</h3>';
      h += '<div style="font-size:13px;color:var(--ts);margin-bottom:12px">Why each runbook section was included based on your selections:</div>';
      h += '<div class="checklist">';
      var traceItems = [];
      // Architecture
      var critLabel = state.workloadCriticality === 'tier-0' ? 'Mission Critical' : state.workloadCriticality === 'tier-1' ? 'Business Critical' : 'Non-Critical';
      var rtoLabel = state.recoveryRequirements === 'rto-lt-1h' ? '< 1 hour' : state.recoveryRequirements === 'rto-1-4h' ? '1–4 hours' : state.recoveryRequirements === 'rto-4-24h' ? '4–24 hours' : '> 24 hours';
      traceItems.push('You selected ' + critLabel + ' criticality + RTO ' + rtoLabel + ', therefore architecture is ' + (archLabels[arch] || arch) + '.');
      // RPO
      var rpoLabels = { 'near-zero': 'Near-zero', 'lt-15m': '< 15 min', 'lt-1h': '< 1 hour', 'lt-24h': '< 24 hours' };
      if (state.rpo) traceItems.push('You selected RPO ' + (rpoLabels[state.rpo] || state.rpo) + ', therefore replication guidance prioritizes ' + (state.rpo === 'near-zero' ? 'continuous replication with minimal lag' : state.rpo === 'lt-15m' ? 'frequent async replication' : 'backup/restore approaches') + '.');
      // Landing zone
      if (state.landingZone === 'control-tower') traceItems.push('You selected Control Tower, therefore a Control Tower readiness verification step was added.');
      else if (state.landingZone === 'custom-lz') traceItems.push('You selected Custom Landing Zone, therefore an SCP/governance verification step was added.');
      // Network topology
      if (state.networkTopology === 'hub-spoke') traceItems.push('You selected Hub-and-Spoke topology, therefore TGW and inspection VPC steps were added.');
      else if (state.networkTopology === 'multi-vpc-tgw') traceItems.push('You selected Multi-VPC + TGW topology, therefore Transit Gateway peering steps were added.');
      else if (state.networkTopology === 'hybrid') traceItems.push('You selected Hybrid topology, therefore Direct Connect failover steps were added.');
      // Network security
      if (state.networkSecurity === 'both') traceItems.push('You selected both Security Groups and NACLs, therefore separate replication steps were added for each.');
      else if (state.networkSecurity === 'security-groups') traceItems.push('You selected Security Groups only, therefore a Security Group replication step was added.');
      else if (state.networkSecurity === 'nacls') traceItems.push('You selected NACLs only, therefore a NACL replication step was added.');
      // Connectivity
      if (state.networkConnectivity === 'direct-connect') traceItems.push('You selected Direct Connect, therefore a DX provisioning step was added.');
      else if (state.networkConnectivity === 'transit-gateway') traceItems.push('You selected Transit Gateway Peering, therefore a TGW peering step was added.');
      else if (state.networkConnectivity === 'vpn') traceItems.push('You selected Site-to-Site VPN, therefore a VPN setup step was added.');
      // App type
      if (state.appType === 'ec2') traceItems.push('You selected EC2/VM-based, therefore AMI copy and EC2 deployment steps were added.');
      else if (state.appType === 'containers') traceItems.push('You selected Containers, therefore ECR replication and ECS/EKS deployment steps were added.');
      else if (state.appType === 'serverless') traceItems.push('You selected Serverless, therefore IaC-based Lambda/API Gateway deployment steps were added.');
      else if (state.appType === 'mixed') traceItems.push('You selected Mixed/Multi-tier, therefore multi-tier deployment steps were added.');
      // Database types
      var dbs = state.dbTypes || [];
      if (dbs.length > 0) {
        var dbLabels = { aurora: 'Aurora', rds: 'RDS', dynamodb: 'DynamoDB', documentdb: 'DocumentDB', elasticache: 'ElastiCache', s3: 'S3', 'rds-other': 'RDS SQL Server/Oracle', 'rds-oracle': 'RDS Oracle', 'rds-sqlserver': 'RDS SQL Server', opensearch: 'OpenSearch' };
        traceItems.push('You selected ' + dbs.map(function (d) { return dbLabels[d] || d; }).join(', ') + ', therefore ' + dbs.length + ' database-specific replication step(s) were generated.');
      }
      // S3 availability impact on DB migration methods
      if (state.sourceS3Availability && (state.dbTypes || []).length > 0) {
        if (state.sourceS3Availability === 'impaired') {
          traceItems.push('You indicated source-region S3 is impaired, so snapshot/S3-dependent migration methods (snapshot copy, cross-region automated backups, S3-based export) were suppressed and logical/network-based methods (pg_dump, mysqldump, BCP, Data Pump via DB link, DMS) were prioritized.');
        } else if (state.sourceS3Availability === 'available') {
          traceItems.push('You confirmed source-region S3 is available, so all migration methods including snapshot copy and S3-based export remain eligible.');
        } else if (state.sourceS3Availability === 'unknown') {
          traceItems.push('You indicated source-region S3 status is unknown, so S3-dependent methods are shown with caution — verify S3 availability via the AWS Health Dashboard before relying on them.');
        }
      }
      // Data handling
      if (state.dataHandling === 'move') traceItems.push('You selected Move Data, therefore a one-time data migration step was added.');
      else if (state.dataHandling === 'replicate') traceItems.push('You selected Replicate Data, therefore a continuous replication step was added.');
      else if (state.dataHandling === 'backup-restore') traceItems.push('You selected Backup & Restore, therefore an AWS Backup configuration step was added.');
      // Compliance
      if (state.compliance === 'data-residency') traceItems.push('You selected Data Residency constraints, therefore a Compliance Validation step was added.');
      else if (state.compliance === 'sovereignty') traceItems.push('You selected Data Sovereignty constraints, therefore a Compliance Validation step was added.');
      // Team readiness
      if (state.teamReadiness === 'beginner') traceItems.push('You selected beginner team readiness, therefore a Guided Execution Advisory step was added with extra safety guidance.');
      // Additional services
      var addSvc = state.additionalServices || [];
      if (addSvc.indexOf('sns-sqs') >= 0) traceItems.push('You selected SNS/SQS, therefore an Application Integration migration step was added.');
      if (addSvc.indexOf('waf') >= 0 || addSvc.indexOf('network-firewall') >= 0) traceItems.push('You selected WAF and/or Network Firewall, therefore a WAF & Network Firewall migration step was added.');
      if (addSvc.indexOf('cognito') >= 0 || addSvc.indexOf('guardduty') >= 0 || addSvc.indexOf('access-analyzer') >= 0) traceItems.push('You selected Cognito/GuardDuty/Access Analyzer, therefore a Security & Identity Services migration step was added.');
      if (addSvc.indexOf('fsx') >= 0) traceItems.push('You selected Amazon FSx, therefore an FSx migration step was added.');
      if (addSvc.indexOf('none') >= 0 || addSvc.length === 0) traceItems.push('No additional services selected — optional service migration steps were omitted.');

      traceItems.forEach(function (item) {
        h += '<div class="checklist__item"><span class="checklist__icon" style="color:var(--bll)">→</span><span style="font-size:13px;color:var(--tl)">' + esc(item) + '</span></div>';
      });
      h += '</div>';
    }

    p.innerHTML = h;
  }

  function renderRisksTab(risks, isPanic) {
    var p = document.getElementById('tab-risks'); if (!p) return;
    var h = '<div class="checklist">';
    risks.forEach(function (r) { var icon = r.startsWith('ACCELERATED RECOVERY') ? '🚨' : '\u26A0'; h += '<div class="checklist__item"><span class="checklist__icon" style="color:var(--or)">' + icon + '</span><span>' + escLink(r) + '</span></div>'; });
    h += '</div>';
    h += '<div class="callout callout--warning" style="margin-top:16px"><strong>Assumptions:</strong> Target region enabled. Quotas requested. Team has access. Change management approved. Validate these prerequisites before proceeding.</div>';
    if (isPanic) h += '<div class="callout callout--warning" style="margin-top:8px"><strong>⚠ Accelerated Recovery Warning:</strong> Reduced testing window. RPO may not be met. Compliance validation may be incomplete. Data loss risk acknowledged.</div>';
    h += '<div class="callout callout--info" style="margin-top:8px"><strong>Disclaimer:</strong> This tool provides general guidance based on common AWS patterns. Actual recovery procedures depend on your specific architecture, configurations, and compliance requirements. Validate all steps with your security, compliance, and operations teams before execution. Refer to official AWS documentation for the most current service capabilities and limitations.</div>';
    p.innerHTML = h;
  }

  function renderReferenceTab(refLib, isPanic) {
    var p = document.getElementById('tab-reference'); if (!p) return;
    var h = '<h3 style="color:var(--tl);font-size:16px;margin-bottom:16px">Reference Library (' + refLib.length + ' topics)</h3>';
    refLib.forEach(function (sec, i) {
      h += '<div class="reference-accordion"><div class="reference-accordion__header" role="button" tabindex="0" aria-expanded="false"><span class="reference-accordion__chevron">\u25B6</span><span class="reference-accordion__title">' + esc(sec.title) + '</span></div><div class="reference-accordion__body" style="display:none">' + sec.content + '</div></div>';
    });
    p.innerHTML = h;
    p.querySelectorAll('.reference-accordion__header').forEach(function (hdr) {
      hdr.addEventListener('click', function () { toggleAccordion(hdr); });
      hdr.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleAccordion(hdr); } });
    });
  }
  function toggleAccordion(hdr) {
    var body = hdr.nextElementSibling, chev = hdr.querySelector('.reference-accordion__chevron');
    var exp = hdr.getAttribute('aria-expanded') === 'true';
    if (exp) { body.style.display = 'none'; hdr.setAttribute('aria-expanded', 'false'); if (chev) chev.textContent = '\u25B6'; }
    else { body.style.display = ''; hdr.setAttribute('aria-expanded', 'true'); if (chev) chev.textContent = '\u25BC'; }
  }

  // ============================================================
  // Tab Switching
  // ============================================================
  function wireTabSwitching() {
    document.querySelectorAll('.results-tab[data-tab]').forEach(function (btn) {
      btn.addEventListener('click', function (e) { e.preventDefault(); switchTab(btn.getAttribute('data-tab')); });
    });
    document.querySelectorAll('.sidebar__link--result[data-tab]').forEach(function (link) {
      link.addEventListener('click', function (e) { e.preventDefault(); switchTab(link.getAttribute('data-tab')); });
    });
  }
  function switchTab(tabId) {
    document.querySelectorAll('.results-panel').forEach(function (p) { p.classList.remove('results-panel--active'); });
    document.querySelectorAll('.results-tab[data-tab]').forEach(function (b) { b.classList.remove('results-tab--active'); });
    document.querySelectorAll('.sidebar__link--result').forEach(function (l) { l.classList.remove('sidebar__link--active'); });
    var target = document.getElementById(tabId); if (target) target.classList.add('results-panel--active');
    var matchBtn = document.querySelector('.results-tab[data-tab="' + tabId + '"]'); if (matchBtn) matchBtn.classList.add('results-tab--active');
    var matchLink = document.querySelector('.sidebar__link--result[data-tab="' + tabId + '"]'); if (matchLink) matchLink.classList.add('sidebar__link--active');
    wireCopyButtons();
  }
  function wireCopyButtons() {
    document.querySelectorAll('.code-block__copy').forEach(function (btn) {
      var nb = btn.cloneNode(true); btn.parentNode.replaceChild(nb, btn);
      nb.addEventListener('click', function () {
        var el = document.getElementById(nb.getAttribute('data-copy-target'));
        if (!el) return;
        var text = el.textContent || el.innerText;
        if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(text).then(function () { flashBtn2(nb, '\u2713 Copied!'); }).catch(function () { fbCopy(text, nb); }); }
        else fbCopy(text, nb);
      });
    });
  }
  function fbCopy(text, btn) {
    var ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.left = '-9999px';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); flashBtn2(btn, '\u2713 Copied!'); } catch (_) { flashBtn2(btn, 'Failed'); }
    document.body.removeChild(ta);
  }
  function flashBtn2(btn, msg) { var o = btn.textContent; btn.textContent = msg; setTimeout(function () { btn.textContent = o; }, 1500); }

  // ============================================================
  // SVG Generators
  // ============================================================
  // Architecture diagrams based on AWS DR Whitepaper patterns
  // Ref: https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/disaster-recovery-options-in-the-cloud.html
  function generateArchSvg(pattern) {
    var a = '#539fe5', g = '#29a329', o = '#FF9900', m = '#8d99a8', r = '#d91515', w = '#fff', bg = '#192534', bd = '#354150';
    var f = 'font-family="system-ui,-apple-system,sans-serif"';
    var svg = '';

    // Common defs for all patterns
    var defs = '<defs>' +
      '<marker id="ah" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0,8 3,0 6" fill="' + a + '"/></marker>' +
      '<marker id="ahg" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0,8 3,0 6" fill="' + g + '"/></marker>' +
      '<marker id="aho" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0,8 3,0 6" fill="' + o + '"/></marker>' +
      '<marker id="ahm" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0,8 3,0 6" fill="' + m + '"/></marker>' +
      '</defs>';

    // Helper: region box with internal components
    function regionBox(x, y, label, color, components, opacity, dashed) {
      var op = opacity || 1;
      var dashAttr = dashed ? ' stroke-dasharray="8,4"' : '';
      var h = '<g>';
      h += '<rect x="' + x + '" y="' + y + '" width="240" height="180" rx="8" stroke="' + color + '" stroke-width="1.5" fill="none" opacity="' + op + '"' + dashAttr + '/>';
      h += '<rect x="' + x + '" y="' + y + '" width="240" height="28" rx="8" fill="' + color + '" opacity="' + (0.15 * op) + '"/>';
      h += '<rect x="' + (x) + '" y="' + (y + 28) + '" width="240" height="0.5" fill="' + color + '" opacity="' + (0.3 * op) + '"/>';
      h += '<text x="' + (x + 12) + '" y="' + (y + 19) + '" fill="' + color + '" font-size="12" font-weight="700" ' + f + ' opacity="' + op + '">' + label + '</text>';
      // Internal component boxes
      var cy = y + 40;
      components.forEach(function (comp) {
        var cColor = comp.active ? (comp.color || a) : m;
        var cOpacity = (comp.active ? 1 : 0.4) * op;
        var cDash = comp.active ? '' : ' stroke-dasharray="4,3"';
        h += '<g opacity="' + cOpacity + '">';
        h += '<rect x="' + (x + 12) + '" y="' + cy + '" width="216" height="28" rx="5" stroke="' + cColor + '" stroke-width="1"' + cDash + ' fill="' + cColor + '" fill-opacity="0.06"/>';
        h += '<text x="' + (x + 24) + '" y="' + (cy + 18) + '" fill="' + (comp.active ? w : m) + '" font-size="11" ' + f + '>' + comp.icon + ' ' + comp.label + '</text>';
        if (comp.badge) {
          h += '<text x="' + (x + 210) + '" y="' + (cy + 18) + '" fill="' + cColor + '" font-size="9" font-weight="600" text-anchor="end" ' + f + '>' + comp.badge + '</text>';
        }
        h += '</g>';
        cy += 34;
      });
      h += '</g>';
      return h;
    }

    // Helper: Route 53 bar at top
    function route53Bar(x1, x2, y, label) {
      var cx = (x1 + x2) / 2;
      var h = '<rect x="' + x1 + '" y="' + y + '" width="' + (x2 - x1) + '" height="24" rx="4" fill="' + o + '" fill-opacity="0.12" stroke="' + o + '" stroke-width="1"/>';
      h += '<text x="' + cx + '" y="' + (y + 16) + '" text-anchor="middle" fill="' + o + '" font-size="10" font-weight="600" ' + f + '>' + label + '</text>';
      return h;
    }

    // Helper: replication arrow
    function replArrow(x1, y1, x2, y2, color, label, dashed) {
      var dash = dashed ? ' stroke-dasharray="6,3"' : '';
      var mid = (x1 + x2) / 2;
      var h = '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + color + '" stroke-width="1.5"' + dash + ' marker-end="url(#ah' + (color === g ? 'g' : color === o ? 'o' : color === m ? 'm' : '') + ')"/>';
      if (label) {
        h += '<text x="' + mid + '" y="' + (y1 - 6) + '" text-anchor="middle" fill="' + color + '" font-size="9" ' + f + '>' + label + '</text>';
      }
      return h;
    }

    switch (pattern) {
      case 'backup-restore':
        // Backup/Restore: Primary active, DR region has only backups (S3/snapshots), no running infra
        svg = '<svg viewBox="0 0 620 260" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Backup and Restore DR architecture — based on AWS DR Whitepaper" style="max-width:620px;width:100%">' + defs;
        svg += route53Bar(20, 600, 8, '☁ Amazon Route 53 — DNS');
        svg += regionBox(20, 44, '⬤ Primary Region (Active)', a, [
          { icon: '▸', label: 'EC2 / ECS / Lambda', active: true, color: a, badge: 'ACTIVE' },
          { icon: '▸', label: 'RDS / DynamoDB', active: true, color: a, badge: 'ACTIVE' },
          { icon: '▸', label: 'S3 / EBS / EFS', active: true, color: a, badge: 'ACTIVE' },
          { icon: '▸', label: 'AWS Backup', active: true, color: g, badge: 'SCHEDULED' }
        ]);
        svg += regionBox(360, 44, '○ Recovery Region (Standby)', m, [
          { icon: '▸', label: 'No running compute', active: false },
          { icon: '▸', label: 'No running databases', active: false },
          { icon: '▸', label: 'Backup copies (S3/snapshots)', active: true, color: m, badge: 'STORED' },
          { icon: '▸', label: 'IaC templates ready to deploy', active: false, badge: 'READY' }
        ], 0.3);
        svg += replArrow(260, 170, 360, 170, m, 'Backup copies (periodic)', true);
        svg += '<text x="310" y="250" text-anchor="middle" fill="' + m + '" font-size="10" ' + f + '>RTO: Hours | RPO: Hours — Lowest cost, highest recovery time</text>';
        svg += '</svg>';
        break;

      case 'pilot-light':
        // Pilot Light: Data layer live in DR, compute switched off
        svg = '<svg viewBox="0 0 620 260" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Pilot Light DR architecture — based on AWS DR Whitepaper" style="max-width:620px;width:100%">' + defs;
        svg += route53Bar(20, 600, 8, '☁ Amazon Route 53 — Failover Routing');
        svg += regionBox(20, 44, '⬤ Primary Region (Active)', a, [
          { icon: '▸', label: 'EC2 / ECS / Lambda', active: true, color: a, badge: 'ACTIVE' },
          { icon: '▸', label: 'RDS / Aurora / DynamoDB', active: true, color: a, badge: 'ACTIVE' },
          { icon: '▸', label: 'S3 (CRR enabled)', active: true, color: a, badge: 'ACTIVE' },
          { icon: '▸', label: 'ALB / API Gateway', active: true, color: a, badge: 'ACTIVE' }
        ]);
        svg += regionBox(360, 44, '◐ Recovery Region (Pilot Light)', o, [
          { icon: '▸', label: 'Compute — switched off', active: false, badge: 'OFF' },
          { icon: '▸', label: 'RDS / Aurora replica', active: true, color: o, badge: 'REPL' },
          { icon: '▸', label: 'S3 replica bucket', active: true, color: o, badge: 'SYNCED' },
          { icon: '▸', label: 'AMIs / IaC ready', active: false, badge: 'READY' }
        ], 0.5);
        svg += replArrow(260, 120, 360, 120, o, 'Continuous replication', false);
        svg += replArrow(260, 155, 360, 155, o, '', true);
        svg += '<text x="310" y="250" text-anchor="middle" fill="' + o + '" font-size="10" ' + f + '>RTO: 10s of min | RPO: Near zero — Data live, compute on-demand</text>';
        svg += '</svg>';
        break;

      case 'warm-standby':
        // Warm Standby: Scaled-down but fully functional copy
        svg = '<svg viewBox="0 0 620 260" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Warm Standby DR architecture — based on AWS DR Whitepaper" style="max-width:620px;width:100%">' + defs;
        svg += route53Bar(20, 600, 8, '☁ Amazon Route 53 — Failover Routing + Health Checks');
        svg += regionBox(20, 44, '⬤ Primary Region (Active)', a, [
          { icon: '▸', label: 'EC2 Auto Scaling (full)', active: true, color: a, badge: 'FULL' },
          { icon: '▸', label: 'RDS Multi-AZ / Aurora', active: true, color: a, badge: 'ACTIVE' },
          { icon: '▸', label: 'S3 / EFS / DynamoDB', active: true, color: a, badge: 'ACTIVE' },
          { icon: '▸', label: 'ALB + WAF', active: true, color: a, badge: 'ACTIVE' }
        ]);
        svg += regionBox(360, 44, '◉ Recovery Region (Warm Standby)', g, [
          { icon: '▸', label: 'EC2 Auto Scaling (reduced)', active: true, color: g, badge: 'REDUCED' },
          { icon: '▸', label: 'RDS / Aurora replica', active: true, color: g, badge: 'REPL' },
          { icon: '▸', label: 'S3 + DynamoDB Global', active: true, color: g, badge: 'SYNCED' },
          { icon: '▸', label: 'ALB (minimal traffic)', active: true, color: g, badge: 'STANDBY' }
        ], 1, true);
        svg += replArrow(260, 120, 360, 120, g, 'Continuous replication', false);
        svg += replArrow(260, 155, 360, 155, g, '', false);
        svg += '<text x="310" y="250" text-anchor="middle" fill="' + g + '" font-size="10" ' + f + '>RTO: Minutes | RPO: Near zero — Scaled down but functional</text>';
        svg += '</svg>';
        break;

      case 'active-active':
        // Multi-site Active/Active: Full production in both regions
        svg = '<svg viewBox="0 0 660 270" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Multi-site Active/Active DR architecture — based on AWS DR Whitepaper" style="max-width:660px;width:100%">' + defs;
        svg += route53Bar(20, 640, 8, '☁ Amazon Route 53 — Latency / Weighted Routing + Health Checks');
        svg += regionBox(20, 44, '⬤ Region A (Active)', a, [
          { icon: '▸', label: 'EC2 Auto Scaling (full)', active: true, color: a, badge: 'ACTIVE' },
          { icon: '▸', label: 'Aurora Global / DynamoDB', active: true, color: a, badge: 'R/W' },
          { icon: '▸', label: 'S3 (bi-directional CRR)', active: true, color: a, badge: 'ACTIVE' },
          { icon: '▸', label: 'ALB + CloudFront', active: true, color: a, badge: 'SERVING' }
        ]);
        svg += regionBox(400, 44, '⬤ Region B (Active)', g, [
          { icon: '▸', label: 'EC2 Auto Scaling (full)', active: true, color: g, badge: 'ACTIVE' },
          { icon: '▸', label: 'Aurora Global / DynamoDB', active: true, color: g, badge: 'R/W' },
          { icon: '▸', label: 'S3 (bi-directional CRR)', active: true, color: g, badge: 'ACTIVE' },
          { icon: '▸', label: 'ALB + CloudFront', active: true, color: g, badge: 'SERVING' }
        ]);
        svg += replArrow(260, 115, 400, 115, a, 'Bi-directional replication', false);
        svg += replArrow(400, 160, 260, 160, g, '', false);
        svg += '<text x="330" y="260" text-anchor="middle" fill="' + g + '" font-size="10" ' + f + '>RTO: Near zero | RPO: Near zero — Both regions serve traffic</text>';
        svg += '</svg>';
        break;

      default:
        svg = '<svg viewBox="0 0 620 260" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="DR architecture" style="max-width:620px;width:100%">' + defs;
        svg += route53Bar(20, 600, 8, '☁ Amazon Route 53');
        svg += regionBox(20, 44, 'Primary Region', a, [
          { icon: '▸', label: 'Workload', active: true, color: a }
        ]);
        svg += regionBox(360, 44, 'Recovery Region', m, [
          { icon: '▸', label: 'Recovery target', active: false }
        ], 0.5);
        svg += replArrow(260, 120, 360, 120, m, 'Recovery path', true);
        svg += '</svg>';
        break;
    }

    return svg;
  }
  function generateTimelineSvg(waves) {
    var w = 500, h = 80, bar = 18, gap = 6, colors = ['#29a329', '#FF9900', '#539fe5'];
    var svg = '<svg viewBox="0 0 ' + w + ' ' + h + '" xmlns="http://www.w3.org/2000/svg" style="max-width:500px;width:100%">';
    var labels = [waves.wave1, waves.wave2, waves.wave3], starts = [0, 0.3, 0.6], widths = [0.35, 0.35, 0.4];
    labels.forEach(function (wave, i) {
      var x = starts[i] * w, bw = widths[i] * w, y = i * (bar + gap) + 8;
      svg += '<rect x="' + x + '" y="' + y + '" width="' + bw + '" height="' + bar + '" rx="4" fill="' + colors[i] + '" opacity="0.8"/>';
      svg += '<text x="' + (x + 8) + '" y="' + (y + 13) + '" fill="#fff" font-size="11" font-family="system-ui">W' + (i + 1) + ': ' + wave.title + '</text>';
    });
    return svg + '</svg>';
  }

  // ============================================================
  // Markdown Export
  // ============================================================
  function generateMarkdown() {
    // Regional Partner Assistance mode
    if (state.urgencyMode === 'regional-partner') {
      var rp = REGIONAL_PARTNERS[state.regionalPartner];
      var md = '# AWS RMA — Regional Partner Assistance\n\nGenerated: ' + new Date().toISOString().split('T')[0] + '\n\n';
      md += '## Mode: Regional Partner Assistance\n\n';
      md += '> AWS partners and ISV tools are optional and can support implementation and accelerate execution of the recovery plan.\n\n';
      if (rp) {
        md += '## Partner: ' + rp.fullName + '\n\n';
        md += '- **Focus:** ' + rp.focus + '\n';
        md += '- **Region:** ' + rp.region + '\n';
        md += '- **Website:** ' + rp.website + '\n';
        if (rp.marketplace) md += '- **AWS Marketplace:** ' + rp.marketplace + '\n';
        var mdS3Status = state.sourceS3Availability || 'not-set';
        if (mdS3Status === 'impaired') {
          md += '\n> ⚠ **S3 Impairment Notice:** S3 is impaired in the source region. S3-dependent recovery actions (S3 sync, S3 replication, snapshot copy via S3) are not available until S3 is restored. Partner engagement steps that reference S3 commands should be treated as deferred / post-recovery actions.\n';
        } else if (mdS3Status === 'unknown' || mdS3Status === 'not-set') {
          md += '\n> ❓ **S3 Availability:** Validate S3 availability via the AWS Health Dashboard before executing S3-dependent recovery steps. If S3 is impaired, defer S3-related actions until service is restored.\n';
        }
        md += '\n## Engagement Steps\n\n';
        rp.engagementSteps.forEach(function (s, i) {
          var stepNum = i + 1;
          var ownerLabel = stepNum >= 5 ? '*(Partner Executed)*' : '*(Customer Action)*';
          md += '### Step ' + stepNum + ': ' + s.step + ' ' + ownerLabel + '\n\n' + s.detail + '\n\n';
          if (s.cmd) {
            if (stepNum >= 5) {
              md += '```bash\n' + s.cmd + '\n```\n\n';
            } else {
              // Customer steps: only show read-only commands
              var isReadOnly = /^aws\s+\S+\s+(describe|list|get)-/.test(s.cmd);
              if (isReadOnly) md += '```bash\n' + s.cmd + '\n```\n\n';
            }
          }
          if (s.validation && s.validation.length) { md += '**Validation:**\n'; s.validation.forEach(function (v) { md += '- [ ] ' + v + '\n'; }); md += '\n'; }
        });
      }
      return md;
    }

    // Partner Matchmaking mode
    if (state.urgencyMode === 'matchmaking') {
      var rec = MATCHMAKING_ENGINE.recommend(state);
      var md = '# AWS RMA — Partner Matchmaking\n\nGenerated: ' + new Date().toISOString().split('T')[0] + '\n\n';
      md += '## Mode: Partner Matchmaking\n\n';
      md += '| Metric | Value |\n|--------|-------|\n';
      md += '| Recommended Partner | ' + rec.partnerName + ' |\n';
      md += '| Confidence | ' + rec.confidence + ' |\n';
      md += '| Score | ' + rec.score + '/100 |\n\n';
      md += '## Reasoning\n\n' + rec.reason + '\n\n';
      md += '## Execution Plan\n\n';
      rec.executionPlan.forEach(function (s, i) {
        md += '### Step ' + (i + 1) + ': ' + s.step + '\n\n' + s.detail + '\n\n';
        if (s.cmd) md += '```bash\n' + s.cmd + '\n```\n\n';
        if (s.validation && s.validation.length) { md += '**Validation:**\n'; s.validation.forEach(function (v) { md += '- [ ] ' + v + '\n'; }); md += '\n'; }
      });
      return md;
    }

    // ============================================================
    // FIX #4: Accelerated Recovery — Partner-only markdown (no strategy runbook)
    // ============================================================
    if (state.urgencyMode === 'immediate-dr') {
      var partnerStep = WIZARD_STEPS.find(function (s) { return s.id === 'panic-partner'; });
      var selectedPartner = state.panicPartner;
      var partnerInfo = partnerStep && partnerStep.partnerDetails && selectedPartner ? partnerStep.partnerDetails[selectedPartner] : null;
      var md = '# AWS RMA — Accelerated Recovery Execution Plan\n\nGenerated: ' + new Date().toISOString().split('T')[0] + '\n\n';
      md += '> **🚨 ACCELERATED RECOVERY** — Fastest viable recovery prioritized.\n\n';
      md += '## Mode: Accelerated Recovery\n\n';
      if (partnerInfo) {
        md += '## Partner: ' + partnerInfo.fullName + '\n\n';
        md += '- **Focus:** ' + partnerInfo.focus + '\n';
        md += '- **Approach:** ' + partnerInfo.approach + '\n';
        md += '- **AWS Marketplace:** ' + partnerInfo.marketplace + '\n';
        md += '- **Website:** ' + partnerInfo.website + '\n';
        md += '\n## Execution Steps\n\n';
        partnerInfo.immediateSteps.forEach(function (s, i) {
          md += '### Step ' + (i + 1) + ': ' + s.step + '\n\n' + s.detail + '\n\n';
          if (s.cmd) md += '```bash\n' + s.cmd + '\n```\n\n';
        });
        md += '## Safety Rails\n\n';
        md += '- Data loss risk: partner tool may not cover all data stores. Pair with AWS Backup or native snapshots.\n';
        md += '- Compliance: validate data residency requirements before moving to target region.\n';
        md += '- Test in non-production first if time permits.\n';
        md += '- Document all actions taken for post-incident review.\n';
        md += '- Verify service availability in target region — not all services and features are available in all regions.\n';
        md += '- This tool provides general guidance only. Validate all steps with your security, compliance, and operations teams.\n';
      } else {
        md += 'No partner selected.\n';
      }
      return md;
    }

    // Architecture Strategy (only — Accelerated Recovery handled above)
    var arch = RULES_ENGINE.getArchitecture(state), c = RULES_ENGINE.getComplexity(state), t = RULES_ENGINE.getTimeline(state), r = RULES_ENGINE.getRiskLevel(state);
    var runbook = RULES_ENGINE.getRunbookSteps(state), cmds = RULES_ENGINE.getCommandBlocks(state), waves = RULES_ENGINE.getWaves(state), risks = RULES_ENGINE.getRisks(state);
    var aL = { 'active-active': 'Active/Active', 'warm-standby': 'Warm Standby', 'pilot-light': 'Pilot Light', 'backup-restore': 'Backup/Restore' };
    var isPanic = state.urgencyMode === 'immediate-dr';
    var md = '# AWS RMA \u2014 Resilience Migration Plan\n\n';
    md += 'Generated: ' + new Date().toISOString().split('T')[0] + '\n';
    if (isPanic) md += '\n> **\ud83d\udea8 ACCELERATED RECOVERY** \u2014 Fastest viable recovery prioritized.\n';
    md += '\n## Summary\n\n| Metric | Value |\n|--------|-------|\n| Architecture | ' + (aL[arch] || arch) + ' |\n| Complexity | ' + c.level + ' (' + c.score + '%) |\n| Timeline | ' + t.label + ' |\n| Risk | ' + r.level + ' |\n\n';
    md += '## Selections\n\n';
    WIZARD_STEPS.forEach(function (step) {
      if (step.multiSelect) { var arr = state[step.stateKey] || []; if (arr.length) md += '- **' + step.title + ':** ' + arr.join(', ') + '\n'; }
      else { var v = state[step.stateKey]; var o = step.options ? step.options.find(function (x) { return x.value === v; }) : null; if (o) md += '- **' + step.title + ':** ' + o.label + '\n'; }
    });
    md += '\n## Runbook\n\n';
    md += '> **Before initiating recovery actions, validate:** the workload is impacted at the business level, observability confirms the scope of impact, and the issue scope (service, AZ, or broader) is understood.\n\n';
    md += '> **Safety:** Validate service availability and permissions before executing recovery steps. Runbooks should be tested prior to production use. Replace all `<PLACEHOLDER>` values before execution.\n\n';
    runbook.forEach(function (s, i) {
      md += '### Step ' + (i + 1) + ': ' + s.title + '\n\n- **Owner:** ' + s.owner + '\n- **Complexity:** ' + s.complexity + '\n\n' + s.description + '\n\n';
      if (s.prereqs && s.prereqs.length) { md += '**Prerequisites:**\n'; s.prereqs.forEach(function (p) { md += '- ' + p + '\n'; }); md += '\n'; }
      if (s.commands && s.commands.length) { md += '```bash\n'; s.commands.forEach(function (c) { md += c + '\n'; }); md += '```\n\n'; }
      if (s.validation && s.validation.length) { md += '**Validation:**\n'; s.validation.forEach(function (v) { md += '- [ ] ' + v + '\n'; }); md += '\n'; }
      if (s.rollback) md += '**Rollback:** ' + s.rollback + '\n\n';
    });
    md += '## Commands\n\n';
    cmds.forEach(function (b) { md += '### ' + b.title + '\n\n```' + b.lang + '\n' + b.commands + '\n```\n\n'; });
    md += '## Wave Plan\n\n';
    [['wave1', '1'], ['wave2', '2'], ['wave3', '3']].forEach(function (w) { var wave = waves[w[0]]; md += '### Wave ' + w[1] + ': ' + wave.title + ' (' + wave.timeframe + ')\n\n'; wave.items.forEach(function (item) { md += '- [ ] ' + item + '\n'; }); md += '\n'; });
    md += '## Risks\n\n'; risks.forEach(function (r) { md += '- ' + r + '\n'; });
    return md;
  }

  // ============================================================
  // Copy / Print / Restart / Edit
  // ============================================================
  function copySummary() {
    var text;

    // Regional Partner Assistance mode
    if (state.urgencyMode === 'regional-partner') {
      var rp = REGIONAL_PARTNERS[state.regionalPartner];
      var lines = ['AWS RMA — Regional Partner Assistance', ''];
      if (rp) {
        lines.push('Partner: ' + rp.fullName);
        lines.push('Focus: ' + rp.focus);
        lines.push('Region: ' + rp.region);
        lines.push('Steps: ' + rp.engagementSteps.length);
      }
      text = lines.join('\n');
    }
    // Partner Matchmaking mode
    else if (state.urgencyMode === 'matchmaking') {
      var rec = MATCHMAKING_ENGINE.recommend(state);
      var lines = ['AWS RMA — Partner Matchmaking', ''];
      lines.push('Recommended Partner: ' + rec.partnerName);
      lines.push('Confidence: ' + rec.confidence);
      lines.push('Score: ' + rec.score + '/100');
      lines.push('');
      lines.push('Key Actions:');
      rec.executionPlan.forEach(function (s, i) { lines.push((i + 1) + '. ' + s.step); });
      text = lines.join('\n');
    }
    // FIX #4: Accelerated Recovery — partner-only summary
    else if (state.urgencyMode === 'immediate-dr') {
      var partnerStep = WIZARD_STEPS.find(function (s) { return s.id === 'panic-partner'; });
      var selectedPartner = state.panicPartner;
      var partnerInfo = partnerStep && partnerStep.partnerDetails && selectedPartner ? partnerStep.partnerDetails[selectedPartner] : null;
      var lines = ['AWS RMA — Accelerated Recovery Summary', ''];
      lines.push('Mode: Accelerated Recovery');
      if (partnerInfo) {
        lines.push('Partner: ' + partnerInfo.fullName);
        lines.push('Focus: ' + partnerInfo.focus);
        lines.push('Steps: ' + partnerInfo.immediateSteps.length);
      }
      text = lines.join('\n');
    }
    // Architecture Strategy only
    else {
      var arch = RULES_ENGINE.getArchitecture(state), c = RULES_ENGINE.getComplexity(state);
      var aL = { 'active-active': 'Active/Active', 'warm-standby': 'Warm Standby', 'pilot-light': 'Pilot Light', 'backup-restore': 'Backup/Restore' };
      var lines = ['AWS RMA \u2014 Summary', ''];
      WIZARD_STEPS.forEach(function (step) {
        if (step.multiSelect) { var arr = state[step.stateKey] || []; if (arr.length) lines.push(step.title + ': ' + arr.join(', ')); }
        else { var v = state[step.stateKey]; var o = step.options ? step.options.find(function (x) { return x.value === v; }) : null; if (o) lines.push(step.title + ': ' + o.label); }
      });
      lines.push(''); lines.push('Architecture: ' + (aL[arch] || arch)); lines.push('Complexity: ' + c.level);
      text = lines.join('\n');
    }

    if (navigator.clipboard) navigator.clipboard.writeText(text).then(function () { flashBtn3('btn-copy-summary', '\u2713'); });
    else { var ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.left = '-9999px'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); flashBtn3('btn-copy-summary', '\u2713'); }
  }
  function copyPlan() {
    var md = generateMarkdown();
    if (navigator.clipboard) navigator.clipboard.writeText(md).then(function () { flashBtn3('btn-copy-plan', '\u2713 Copied!'); });
    else { var ta = document.createElement('textarea'); ta.value = md; ta.style.position = 'fixed'; ta.style.left = '-9999px'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); flashBtn3('btn-copy-plan', '\u2713 Copied!'); }
  }
  function copyScript() {
    // Generate executable shell script from runbook commands
    var lines = ['#!/bin/bash', '# AWS Region Recovery — Executable Runbook Script', '# Generated: ' + new Date().toISOString().split('T')[0], '# ⚠ REVIEW ALL COMMANDS BEFORE EXECUTING — replace all <PLACEHOLDER> values', '# ⚠ This script is generated as guidance — validate in your environment', '# ⚠ Validate service availability and permissions before executing recovery steps', '# ⚠ Runbooks should be tested prior to production use', '', 'set -euo pipefail', ''];
    if (state.urgencyMode === 'architecture-strategy') {
      var runbook = RULES_ENGINE.getRunbookSteps(state);
      runbook.forEach(function (step, i) {
        lines.push('# ════════════════════════════════════════════════════');
        lines.push('# Step ' + (i + 1) + ': ' + step.title);
        lines.push('# Owner: ' + step.owner + ' | Complexity: ' + step.complexity);
        lines.push('# ════════════════════════════════════════════════════');
        if (step.description) lines.push('# ' + step.description.substring(0, 120));
        lines.push('');
        if (step.prereqs && step.prereqs.length) {
          lines.push('# Prerequisites:');
          step.prereqs.forEach(function (p) { lines.push('#   - ' + p); });
          lines.push('');
        }
        if (step.commands && step.commands.length) {
          step.commands.forEach(function (c) { lines.push(c); });
          lines.push('');
        }
        if (step.validation && step.validation.length) {
          lines.push('# Validation:');
          step.validation.forEach(function (v) { lines.push('#   ✓ ' + v); });
          lines.push('');
        }
      });
    }
    var script = lines.join('\n');
    if (navigator.clipboard) navigator.clipboard.writeText(script).then(function () { flashBtn3('btn-copy-script', '\u2713 Copied!'); });
    else { var ta = document.createElement('textarea'); ta.value = script; ta.style.position = 'fixed'; ta.style.left = '-9999px'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); flashBtn3('btn-copy-script', '\u2713 Copied!'); }
  }
  function flashBtn3(id, msg) { var b = document.getElementById(id); if (!b) return; var o = b.textContent; b.textContent = msg; setTimeout(function () { b.textContent = o; }, 1500); }
  function restart() {
    clearState(); resultsSection.classList.remove('results--visible'); wizardSection.style.display = '';
    document.getElementById('topnav-badge').textContent = 'Assessment'; document.getElementById('topnav-badge').className = 'topnav__badge topnav__badge--active';
    document.getElementById('sidebar-results-section').style.display = 'none'; document.getElementById('sidebar-results-links').style.display = 'none';
    currentStep = 0; renderStep();
  }
  function editAnswers() {
    resultsSection.classList.remove('results--visible'); wizardSection.style.display = '';
    document.getElementById('topnav-badge').textContent = 'Assessment'; document.getElementById('topnav-badge').className = 'topnav__badge topnav__badge--active';
    document.getElementById('sidebar-results-section').style.display = 'none'; document.getElementById('sidebar-results-links').style.display = 'none';
    currentStep = 0; renderStep();
  }

  // ============================================================
  // Init
  // ============================================================
  function init() {
    initDom();
    if (loadState() && Object.keys(state).length > 0) {
      resumeBanner.style.display = '';
      document.getElementById('resume-btn').addEventListener('click', function () { resumeBanner.style.display = 'none'; renderStep(); });
      document.getElementById('restart-saved-btn').addEventListener('click', function () { resumeBanner.style.display = 'none'; clearState(); renderStep(); });
    }
    renderStep();
    btnBack.addEventListener('click', function () { var p = prevVisibleStep(currentStep); if (p >= 0) { currentStep = p; renderStep(); } });
    btnNext.addEventListener('click', function () { var info = getVisibleStepInfo(); if (info.isLast) { saveState(); showResults(); } else { var n = nextVisibleStep(currentStep); if (n >= 0) { currentStep = n; renderStep(); } } });
    var cs = document.getElementById('btn-copy-summary'); if (cs) cs.addEventListener('click', copySummary);
    var cp = document.getElementById('btn-copy-plan'); if (cp) cp.addEventListener('click', copyPlan);
    var csh = document.getElementById('btn-copy-script'); if (csh) csh.addEventListener('click', copyScript);
    var pr = document.getElementById('btn-print'); if (pr) pr.addEventListener('click', function () { window.print(); });
    var rs = document.getElementById('btn-restart'); if (rs) rs.addEventListener('click', restart);
    var ea = document.getElementById('btn-edit-answers'); if (ea) ea.addEventListener('click', editAnswers);

    // Nav logo + title → reset to home
    var navLogo = document.getElementById('nav-home-logo');
    var navTitle = document.getElementById('nav-home-title');
    function navHome(e) { e.preventDefault(); restart(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    if (navLogo) navLogo.addEventListener('click', navHome);
    if (navTitle) navTitle.addEventListener('click', navHome);
    // Initialize health status panel
    wireHealthFilters();
    wireHealthRefresh();
    wireHealthCardExpand();
    // Pre-populate from cache if fresh (within TTL), otherwise start clean
    (function preloadHealthState() {
      var cached = loadHealthCache();
      if (cached && cached.incidents && cached.incidents.length > 0) {
        healthIncidents = cached.incidents.map(function (inc) {
          if (inc.updatedAt) inc.updatedAt = new Date(inc.updatedAt);
          return inc;
        });
        healthState = 'incidents';
        healthLastUpdated = new Date(cached.timestamp);
        healthFromCache = true;
      }
      // If cache is expired or empty, leave healthState as 'loading'
      // and let fetchHealthStatus() populate fresh data
    })();
    renderHealthPanel();
    renderRssStatus(null); // show "checking..." immediately
    fetchHealthStatus();
    checkAwsHealthRSS().then(renderRssStatus);
    setInterval(function () { fetchHealthStatus(); checkAwsHealthRSS().then(renderRssStatus); }, 120000);
  }

  // ============================================================
  // AWS Service Disruption Status Panel (v2)
  // Fetches public RSS feed from status.aws.amazon.com
  // Normalizes events into service/region incident cards
  // ============================================================
  var HEALTH_CACHE_KEY = 'rma-health-cache';
  var HEALTH_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  var HEALTH_MAX_INCIDENTS = 15; // max incidents to display
  var HEALTH_DEBUG = false; // set to true to enable verbose console logging
  var healthIncidents = [];
  var healthState = 'loading'; // loading | ok | error | incidents
  var healthLastUpdated = null;
  var healthFromCache = false;
  var healthActiveFilter = 'all';
  var healthFetchSource = ''; // 'direct' | 'proxy:allorigins' | 'proxy:corsproxy' | 'cache' | 'error'
  var healthFetchSuccess = false; // true only when live or cached feed was actually parsed

  // Internal debug log — captures last fetch cycle for diagnostics
  var healthDebugLog = {
    lastFetchUrl: '',
    lastFetchSource: '',
    lastFetchTimestamp: null,
    lastResponseLength: 0,
    lastParsedCount: 0,
    lastDedupedCount: 0,
    lastRenderedCount: 0,
    cacheHit: false,
    error: null
  };

  function healthLog(msg) {
    if (typeof console !== 'undefined' && console.log) {
      console.log('[RMA Health] ' + msg);
    }
  }

  // Known region aliases for parsing RSS titles
  var HEALTH_REGION_MAP = [
    // Americas
    { code: 'us-east-1', name: 'N. Virginia', aliases: ['n. virginia', 'us-east-1', 'virginia'] },
    { code: 'us-east-2', name: 'Ohio', aliases: ['ohio', 'us-east-2'] },
    { code: 'us-west-1', name: 'N. California', aliases: ['n. california', 'us-west-1', 'california'] },
    { code: 'us-west-2', name: 'Oregon', aliases: ['oregon', 'us-west-2'] },
    { code: 'ca-central-1', name: 'Canada', aliases: ['canada', 'ca-central-1', 'montreal'] },
    { code: 'ca-west-1', name: 'Calgary', aliases: ['calgary', 'ca-west-1'] },
    { code: 'sa-east-1', name: 'São Paulo', aliases: ['sao paulo', 'sa-east-1', 'south america'] },
    { code: 'mx-central-1', name: 'Mexico', aliases: ['mexico', 'mx-central-1'] },
    // Europe
    { code: 'eu-west-1', name: 'Ireland', aliases: ['ireland', 'eu-west-1'] },
    { code: 'eu-west-2', name: 'London', aliases: ['london', 'eu-west-2'] },
    { code: 'eu-west-3', name: 'Paris', aliases: ['paris', 'eu-west-3'] },
    { code: 'eu-central-1', name: 'Frankfurt', aliases: ['frankfurt', 'eu-central-1'] },
    { code: 'eu-central-2', name: 'Zurich', aliases: ['zurich', 'eu-central-2'] },
    { code: 'eu-north-1', name: 'Stockholm', aliases: ['stockholm', 'eu-north-1'] },
    { code: 'eu-south-1', name: 'Milan', aliases: ['milan', 'eu-south-1'] },
    { code: 'eu-south-2', name: 'Spain', aliases: ['spain', 'eu-south-2'] },
    // Middle East & Africa
    { code: 'me-south-1', name: 'Bahrain', aliases: ['bahrain', 'me-south-1', 'middle east'] },
    { code: 'me-central-1', name: 'UAE', aliases: ['uae', 'me-central-1', 'united arab'] },
    { code: 'il-central-1', name: 'Tel Aviv', aliases: ['tel aviv', 'il-central-1', 'israel'] },
    { code: 'af-south-1', name: 'Cape Town', aliases: ['cape town', 'af-south-1', 'africa'] },
    // Asia Pacific
    { code: 'ap-northeast-1', name: 'Tokyo', aliases: ['tokyo', 'ap-northeast-1'] },
    { code: 'ap-northeast-2', name: 'Seoul', aliases: ['seoul', 'ap-northeast-2'] },
    { code: 'ap-northeast-3', name: 'Osaka', aliases: ['osaka', 'ap-northeast-3'] },
    { code: 'ap-southeast-1', name: 'Singapore', aliases: ['singapore', 'ap-southeast-1'] },
    { code: 'ap-southeast-2', name: 'Sydney', aliases: ['sydney', 'ap-southeast-2'] },
    { code: 'ap-southeast-3', name: 'Jakarta', aliases: ['jakarta', 'ap-southeast-3'] },
    { code: 'ap-southeast-4', name: 'Melbourne', aliases: ['melbourne', 'ap-southeast-4'] },
    { code: 'ap-southeast-5', name: 'Malaysia', aliases: ['malaysia', 'ap-southeast-5', 'kuala lumpur'] },
    { code: 'ap-southeast-7', name: 'Thailand', aliases: ['thailand', 'ap-southeast-7', 'bangkok'] },
    { code: 'ap-south-1', name: 'Mumbai', aliases: ['mumbai', 'ap-south-1'] },
    { code: 'ap-south-2', name: 'Hyderabad', aliases: ['hyderabad', 'ap-south-2'] },
    { code: 'ap-east-1', name: 'Hong Kong', aliases: ['hong kong', 'ap-east-1'] },
    // GovCloud
    { code: 'us-gov-west-1', name: 'GovCloud West', aliases: ['govcloud', 'us-gov-west-1', 'gov-west'] },
    { code: 'us-gov-east-1', name: 'GovCloud East', aliases: ['us-gov-east-1', 'gov-east'] }
  ];

  // Severity classification patterns
  var SEVERITY_PATTERNS = [
    { match: 'service disruption', severity: 'disruption', label: 'Disruption', color: 'red' },
    { match: 'service impact', severity: 'degraded', label: 'Degraded', color: 'orange' },
    { match: 'performance issues', severity: 'performance', label: 'Performance', color: 'yellow' },
    { match: 'informational message', severity: 'info', label: 'Informational', color: 'blue' }
  ];

  // ── Health-Aware Region Recommendation Engine ──
  // Analyzes current healthIncidents to determine impacted regions
  // and suggest safe target regions for migration/DR.
  var REGION_GROUPS = {
    americas: [
      { code: 'us-east-1', name: 'N. Virginia', latencyTier: 'high' },
      { code: 'us-east-2', name: 'Ohio', latencyTier: 'high' },
      { code: 'us-west-2', name: 'Oregon', latencyTier: 'medium' },
      { code: 'us-west-1', name: 'N. California', latencyTier: 'medium' },
      { code: 'ca-central-1', name: 'Canada', latencyTier: 'medium' },
      { code: 'sa-east-1', name: 'São Paulo', latencyTier: 'low' }
    ],
    europe: [
      { code: 'eu-west-1', name: 'Ireland', latencyTier: 'high' },
      { code: 'eu-central-1', name: 'Frankfurt', latencyTier: 'high' },
      { code: 'eu-west-2', name: 'London', latencyTier: 'medium' },
      { code: 'eu-west-3', name: 'Paris', latencyTier: 'medium' },
      { code: 'eu-north-1', name: 'Stockholm', latencyTier: 'medium' },
      { code: 'eu-south-1', name: 'Milan', latencyTier: 'low' }
    ],
    apac: [
      { code: 'ap-southeast-1', name: 'Singapore', latencyTier: 'high' },
      { code: 'ap-northeast-1', name: 'Tokyo', latencyTier: 'high' },
      { code: 'ap-southeast-2', name: 'Sydney', latencyTier: 'medium' },
      { code: 'ap-south-1', name: 'Mumbai', latencyTier: 'medium' },
      { code: 'ap-northeast-2', name: 'Seoul', latencyTier: 'medium' }
    ],
    mena: [
      { code: 'me-south-1', name: 'Bahrain', latencyTier: 'high' },
      { code: 'me-central-1', name: 'UAE', latencyTier: 'high' },
      { code: 'il-central-1', name: 'Tel Aviv', latencyTier: 'medium' },
      { code: 'af-south-1', name: 'Cape Town', latencyTier: 'low' }
    ]
  };

  function getImpactedRegionCodes() {
    var codes = [];
    healthIncidents.forEach(function (inc) {
      if (inc.region && inc.region.code && codes.indexOf(inc.region.code) < 0) {
        codes.push(inc.region.code);
      }
    });
    return codes;
  }

  function getHealthAwareRegionRecommendation() {
    var impacted = getImpactedRegionCodes();
    if (impacted.length === 0 && healthIncidents.length === 0 && healthState !== 'incidents') {
      return null; // No disruptions known — no advisory needed
    }
    // If we have incidents but none with identifiable region codes, still show advisory
    // but with a generic message rather than specific region cards
    var hasRegionData = impacted.length > 0;

    // Build impacted region details
    var impactedDetails = [];
    healthIncidents.forEach(function (inc) {
      if (inc.region && inc.region.code) {
        var existing = impactedDetails.find(function (d) { return d.code === inc.region.code; });
        if (!existing) {
          impactedDetails.push({
            code: inc.region.code,
            name: inc.region.name,
            severity: inc.severity,
            severityLabel: inc.severityLabel,
            summary: inc.summary
          });
        }
      }
    });

    // Determine which region group the user is likely in based on impacted regions
    var likelyGroup = 'mena'; // default assumption
    impacted.forEach(function (code) {
      if (code.indexOf('us-') === 0 || code.indexOf('ca-') === 0 || code.indexOf('sa-') === 0) likelyGroup = 'americas';
      else if (code.indexOf('eu-') === 0) likelyGroup = 'europe';
      else if (code.indexOf('ap-') === 0) likelyGroup = 'apac';
      else if (code.indexOf('me-') === 0 || code.indexOf('af-') === 0 || code.indexOf('il-') === 0) likelyGroup = 'mena';
    });

    // Recommend safe regions: prefer same geo first, then nearby geos
    var safeRegions = [];
    var groupOrder;
    if (likelyGroup === 'mena') groupOrder = ['europe', 'apac', 'americas'];
    else if (likelyGroup === 'europe') groupOrder = ['europe', 'americas', 'apac'];
    else if (likelyGroup === 'apac') groupOrder = ['apac', 'americas', 'europe'];
    else groupOrder = ['americas', 'europe', 'apac'];

    // Also check same group for unaffected regions
    var sameGroup = REGION_GROUPS[likelyGroup] || [];
    sameGroup.forEach(function (r) {
      if (impacted.indexOf(r.code) < 0) {
        safeRegions.push({ code: r.code, name: r.name, group: likelyGroup, latencyTier: r.latencyTier, sameGeo: true });
      }
    });

    groupOrder.forEach(function (grp) {
      if (grp === likelyGroup) return; // already handled
      (REGION_GROUPS[grp] || []).forEach(function (r) {
        if (impacted.indexOf(r.code) < 0) {
          safeRegions.push({ code: r.code, name: r.name, group: grp, latencyTier: r.latencyTier, sameGeo: false });
        }
      });
    });

    // Pick top recommendations (up to 3 primary + 3 alternate)
    var primary = safeRegions.filter(function (r) { return r.latencyTier === 'high'; }).slice(0, 3);
    var alternate = safeRegions.filter(function (r) { return r.latencyTier !== 'high' && !primary.find(function (p) { return p.code === r.code; }); }).slice(0, 3);

    return {
      impacted: impactedDetails,
      impactedCodes: impacted,
      likelyGroup: likelyGroup,
      primary: primary,
      alternate: alternate,
      hasActiveDisruptions: impactedDetails.length > 0 || healthIncidents.length > 0,
      hasRegionData: hasRegionData,
      isFromCache: healthFromCache,
      lastUpdated: healthLastUpdated
    };
  }

  // Render the health-aware region advisory card (HTML string)
  function renderHealthRegionAdvisory() {
    var rec = getHealthAwareRegionRecommendation();
    if (!rec) return ''; // No advisory needed

    var h = '<div class="result-card" style="border-left:3px solid var(--rd);margin-bottom:20px">';
    h += '<div class="result-card__header" style="background:rgba(217,21,21,.06)">';
    h += '<span class="result-card__title" style="color:var(--rd)">⚠️ Active AWS Disruptions — Region Recommendation</span>';
    if (rec.lastUpdated) {
      h += '<span style="font-size:11px;color:var(--ts)">' + (rec.isFromCache ? 'Cached · ' : '') + 'Updated ' + healthTimeAgo(rec.lastUpdated) + '</span>';
    }
    h += '</div><div class="result-card__body">';

    // Impacted regions
    if (rec.impacted.length > 0) {
      h += '<div style="margin-bottom:16px">';
      h += '<div style="font-size:12px;font-weight:700;color:var(--rd);text-transform:uppercase;letter-spacing:.8px;margin-bottom:8px">Impacted Regions</div>';
      h += '<div style="display:flex;flex-wrap:wrap;gap:8px">';
      rec.impacted.forEach(function (r) {
        var bgColor = r.severity === 'disruption' ? 'rgba(217,21,21,.1)' : 'rgba(255,153,0,.1)';
        var borderColor = r.severity === 'disruption' ? 'rgba(217,21,21,.3)' : 'rgba(255,153,0,.3)';
        var textColor = r.severity === 'disruption' ? 'var(--rd)' : 'var(--or)';
        h += '<div style="padding:8px 12px;background:' + bgColor + ';border:1px solid ' + borderColor + ';border-radius:8px;flex:1;min-width:200px">';
        h += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">';
        h += '<span style="width:8px;height:8px;border-radius:50%;background:' + textColor + ';animation:pulse-health 1.5s infinite;flex-shrink:0"></span>';
        h += '<span style="font-size:13px;font-weight:700;color:' + textColor + '">' + esc(r.code) + ' — ' + esc(r.name) + '</span>';
        h += '</div>';
        h += '<span style="font-size:11px;color:var(--tl)">' + esc(r.severityLabel) + '</span>';
        h += '</div>';
      });
      h += '</div></div>';

      h += '<div class="callout callout--warning" style="margin-bottom:16px;font-size:12px">';
      h += '<strong>AWS recommends</strong> migrating workloads away from affected regions. Consider US, Europe, or Asia Pacific regions based on your latency and data residency requirements.';
      h += '</div>';
    } else if (rec.hasActiveDisruptions && !rec.hasRegionData) {
      // Incidents exist but no specific region identified
      h += '<div class="callout callout--warning" style="margin-bottom:16px;font-size:12px">';
      h += '<strong>Active disruptions detected</strong> in the public AWS status feed, but specific impacted regions could not be determined from the available data. ';
      h += 'Check the <a href="https://status.aws.amazon.com/" target="_blank" rel="noopener" style="color:var(--bll)">AWS Status Page</a> for details.';
      h += '</div>';
    }

    // Recommended target regions
    if (rec.primary.length > 0) {
      h += '<div style="margin-bottom:12px">';
      h += '<div style="font-size:12px;font-weight:700;color:var(--gr);text-transform:uppercase;letter-spacing:.8px;margin-bottom:8px">Recommended Target Regions</div>';
      h += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px">';
      rec.primary.forEach(function (r) {
        var groupLabel = r.group === 'americas' ? '🌎' : r.group === 'europe' ? '🌍' : r.group === 'apac' ? '🌏' : '🌍';
        h += '<div style="padding:10px 14px;background:rgba(41,163,41,.06);border:1px solid rgba(41,163,41,.2);border-radius:8px">';
        h += '<div style="font-size:13px;font-weight:700;color:var(--gr)">' + groupLabel + ' ' + esc(r.code) + '</div>';
        h += '<div style="font-size:11px;color:var(--tl)">' + esc(r.name) + (r.sameGeo ? ' · Same geo' : '') + '</div>';
        h += '</div>';
      });
      h += '</div></div>';
    }

    if (rec.alternate.length > 0) {
      h += '<div style="margin-bottom:12px">';
      h += '<div style="font-size:12px;font-weight:700;color:var(--bll);text-transform:uppercase;letter-spacing:.8px;margin-bottom:8px">Alternate Regions</div>';
      h += '<div style="display:flex;flex-wrap:wrap;gap:6px">';
      rec.alternate.forEach(function (r) {
        h += '<span style="padding:4px 10px;background:rgba(9,114,211,.06);border:1px solid rgba(9,114,211,.15);border-radius:6px;font-size:11px;color:var(--bll)">' + esc(r.code) + ' · ' + esc(r.name) + '</span>';
      });
      h += '</div></div>';
    }

    // Disclaimer
    h += '<div style="font-size:11px;color:var(--ts);margin-top:12px;padding-top:10px;border-top:1px solid var(--bd)">';
    h += 'Region recommendations are based on public AWS status data and may not reflect all events. Verify service availability in your target region at ';
    h += '<a href="https://aws.amazon.com/about-aws/global-infrastructure/regional-product-services/" target="_blank" rel="noopener" style="color:var(--bll)">AWS Regional Services</a>. ';
    h += 'Check <a href="https://health.aws.amazon.com/health/status" target="_blank" rel="noopener" style="color:var(--bll)">AWS Health Dashboard</a> for account-specific events.';
    h += '</div>';

    h += '</div></div>';
    return h;
  }

  // Friendly time-ago formatter
  function healthTimeAgo(date) {
    if (!date) return '';
    var s = Math.floor((Date.now() - date.getTime()) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return Math.floor(s / 60) + 'm ago';
    if (s < 86400) return Math.floor(s / 3600) + 'h ago';
    return Math.floor(s / 86400) + 'd ago';
  }

  // Classify severity from RSS title
  function classifySeverity(title) {
    var t = title.toLowerCase();
    for (var i = 0; i < SEVERITY_PATTERNS.length; i++) {
      if (t.indexOf(SEVERITY_PATTERNS[i].match) >= 0) return SEVERITY_PATTERNS[i];
    }
    return { match: '', severity: 'info', label: 'Informational', color: 'blue' };
  }

  // Extract region from RSS title parenthetical, GUID, or description
  function extractRegion(title, guid, desc) {
    // 1. Try parenthetical in title: "Service name (us-east-1)"
    var m = title.match(/\(([^)]+)\)/);
    if (m) {
      var raw = m[1].trim().toLowerCase();
      for (var i = 0; i < HEALTH_REGION_MAP.length; i++) {
        for (var j = 0; j < HEALTH_REGION_MAP[i].aliases.length; j++) {
          if (raw.indexOf(HEALTH_REGION_MAP[i].aliases[j]) >= 0) {
            return { code: HEALTH_REGION_MAP[i].code, name: HEALTH_REGION_MAP[i].name };
          }
        }
      }
      return { code: '', name: m[1].trim() };
    }
    // 2. Try GUID: often contains "servicename-region-code_timestamp"
    if (guid) {
      var gl = guid.toLowerCase();
      for (var k = 0; k < HEALTH_REGION_MAP.length; k++) {
        if (gl.indexOf(HEALTH_REGION_MAP[k].code) >= 0) {
          return { code: HEALTH_REGION_MAP[k].code, name: HEALTH_REGION_MAP[k].name };
        }
      }
    }
    // 3. Try description: look for region codes or names
    if (desc) {
      var dl = desc.toLowerCase();
      for (var n = 0; n < HEALTH_REGION_MAP.length; n++) {
        if (dl.indexOf(HEALTH_REGION_MAP[n].code) >= 0) {
          return { code: HEALTH_REGION_MAP[n].code, name: HEALTH_REGION_MAP[n].name };
        }
      }
      // Also try region name patterns like "Middle East (UAE)"
      for (var p = 0; p < HEALTH_REGION_MAP.length; p++) {
        for (var q = 0; q < HEALTH_REGION_MAP[p].aliases.length; q++) {
          if (dl.indexOf(HEALTH_REGION_MAP[p].aliases[q]) >= 0) {
            return { code: HEALTH_REGION_MAP[p].code, name: HEALTH_REGION_MAP[p].name };
          }
        }
      }
    }
    return { code: '', name: 'Not specified publicly' };
  }

  // Extract service name from RSS title
  function extractService(title) {
    var svc = title;
    var pi = title.indexOf('(');
    if (pi > 0) svc = title.substring(0, pi).trim();
    svc = svc.replace(/^Informational message:\s*/i, '')
             .replace(/^Service disruption:\s*/i, '')
             .replace(/^Service impact:\s*/i, '')
             .replace(/^Performance issues:\s*/i, '')
             .replace(/^Service is operating normally:\s*/i, '');
    return svc || 'General';
  }

  // Parse RSS XML into normalized incidents
  function parseHealthRSS(xml) {
    var parser = new DOMParser();
    var doc = parser.parseFromString(xml, 'text/xml');
    var items = doc.querySelectorAll('item');
    var cutoff = Date.now() - (90 * 24 * 60 * 60 * 1000); // 90 days — extended window for prolonged regional incidents
    var incidents = [];
    var seenTitles = {};
    var seenGuids = {};
    var totalParsed = 0;
    items.forEach(function (item) {
      totalParsed++;
      var title = item.querySelector('title') ? item.querySelector('title').textContent.trim() : '';
      var desc = item.querySelector('description') ? item.querySelector('description').textContent.trim() : '';
      var pubDate = item.querySelector('pubDate') ? new Date(item.querySelector('pubDate').textContent) : null;
      var link = item.querySelector('link') ? item.querySelector('link').textContent.trim() : '';
      var guid = item.querySelector('guid') ? item.querySelector('guid').textContent.trim() : '';
      if (pubDate && pubDate.getTime() < cutoff) return;
      // Deduplicate by GUID first, then by title
      if (guid && seenGuids[guid]) return;
      if (guid) seenGuids[guid] = true;
      if (!title || seenTitles[title]) return;
      seenTitles[title] = true;
      var tl = title.toLowerCase();
      if (tl.indexOf('operating normally') >= 0) return;
      var sev = classifySeverity(title);
      var region = extractRegion(title, guid, desc);
      var service = extractService(title);
      // If service is generic, try to get more detail from GUID
      if (service === 'Increased Error Rates' || service === 'Increased Connectivity Issues and API Error Rates' || service === 'Increased Connectivity Issues') {
        // Check GUID for service hint like "multipleservices-me-central-1"
        if (guid && guid.toLowerCase().indexOf('multipleservices') >= 0) {
          service = 'Multiple Services';
        }
      }
      // Strip HTML from description
      var cleanDesc = desc.replace(/<[^>]+>/g, '').substring(0, 300);
      incidents.push({
        title: title,
        service: service,
        region: region,
        severity: sev.severity,
        severityLabel: sev.label,
        severityColor: sev.color,
        updatedAt: pubDate,
        summary: cleanDesc,
        sourceUrl: link || 'https://status.aws.amazon.com/'
      });
    });
    // Sort by date descending (most recent first)
    incidents.sort(function (a, b) {
      var ta = a.updatedAt ? a.updatedAt.getTime() : 0;
      var tb = b.updatedAt ? b.updatedAt.getTime() : 0;
      return tb - ta;
    });
    // Update debug log
    healthDebugLog.lastParsedCount = totalParsed;
    healthDebugLog.lastDedupedCount = incidents.length;
    if (HEALTH_DEBUG) healthLog('Parsed ' + totalParsed + ' RSS items → ' + incidents.length + ' after dedup/filter');
    // Limit to max incidents
    if (incidents.length > HEALTH_MAX_INCIDENTS) {
      incidents = incidents.slice(0, HEALTH_MAX_INCIDENTS);
    }
    return incidents;
  }

  // Save to localStorage cache
  function saveHealthCache(incidents) {
    try {
      localStorage.setItem(HEALTH_CACHE_KEY, JSON.stringify({
        incidents: incidents,
        timestamp: Date.now()
      }));
    } catch (_) {}
  }

  // Load from localStorage cache (returns null if expired or missing)
  function loadHealthCache() {
    try {
      var raw = localStorage.getItem(HEALTH_CACHE_KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (data && data.incidents && data.timestamp) {
        // Check TTL — return null if cache is stale
        if (Date.now() - data.timestamp > HEALTH_CACHE_TTL) return null;
        return data;
      }
    } catch (_) {}
    return null;
  }

  // Load from localStorage cache ignoring TTL (last-resort fallback when fetch fails)
  function loadHealthCacheAnyAge() {
    try {
      var raw = localStorage.getItem(HEALTH_CACHE_KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (data && data.incidents && data.timestamp) return data;
    } catch (_) {}
    return null;
  }

  // Update the icon in the header
  function updateHealthIcon(state) {
    var icon = document.getElementById('health-icon');
    if (!icon) return;
    icon.className = 'health-panel__icon';
    if (state === 'incidents') icon.classList.add('health-panel__icon--red');
    else if (state === 'ok') icon.classList.add('health-panel__icon--green');
    else if (state === 'error') icon.classList.add('health-panel__icon--grey');
    else icon.classList.add('health-panel__icon--loading');
  }

  // Update timestamp display with source indicator
  function updateHealthTimestamp() {
    var el = document.getElementById('health-timestamp');
    if (!el || !healthLastUpdated) return;
    var sourceLabel = '';
    if (healthFromCache) {
      sourceLabel = 'Cached RSS · ';
    } else if (healthFetchSource === 'direct') {
      sourceLabel = 'Live RSS · ';
    } else if (healthFetchSource.indexOf('proxy:') === 0) {
      sourceLabel = 'Live RSS (proxy) · ';
    }
    el.textContent = sourceLabel + 'Updated ' + healthTimeAgo(healthLastUpdated);
  }

  // Render the summary badge
  function renderHealthSummary() {
    var el = document.getElementById('health-summary');
    if (!el) return;
    var h = '';
    if (healthState === 'loading') {
      h = '<span class="health-summary-badge health-summary-badge--blue"><span class="health-summary-dot health-summary-dot--blue"></span>Checking public RSS feed\u2026</span>';
    } else if (healthState === 'error') {
      h = '<span class="health-summary-badge health-summary-badge--grey"><span class="health-summary-dot health-summary-dot--grey"></span>Could not retrieve RSS feed — check <a href="https://health.aws.amazon.com/health/status" target="_blank" rel="noopener" style="color:inherit;text-decoration:underline">AWS Health Dashboard</a> directly</span>';
    } else if (healthIncidents.length === 0) {
      if (healthFetchSuccess) {
        h = '<span class="health-summary-badge health-summary-badge--green"><span class="health-summary-dot health-summary-dot--green"></span>No disruptions in public RSS feed</span>';
        h += '<span style="display:block;font-size:10px;color:var(--ts);margin-top:4px">Public feed only — check <a href="https://health.aws.amazon.com/health/status" target="_blank" rel="noopener" style="color:var(--bll);text-decoration:none">AWS Health Dashboard</a> for account-specific events</span>';
      } else {
        h = '<span class="health-summary-badge health-summary-badge--grey"><span class="health-summary-dot health-summary-dot--grey"></span>Unable to verify — check <a href="https://health.aws.amazon.com/health/status" target="_blank" rel="noopener" style="color:inherit;text-decoration:underline">AWS Health Dashboard</a> directly</span>';
      }
    } else {
      var hasDisruption = healthIncidents.some(function (i) { return i.severity === 'disruption'; });
      if (hasDisruption) {
        h = '<span class="health-summary-badge health-summary-badge--red"><span class="health-summary-dot health-summary-dot--red"></span>' + healthIncidents.length + ' event' + (healthIncidents.length > 1 ? 's' : '') + ' in RSS feed</span>';
      } else {
        h = '<span class="health-summary-badge health-summary-badge--orange"><span class="health-summary-dot health-summary-dot--orange"></span>' + healthIncidents.length + ' event' + (healthIncidents.length > 1 ? 's' : '') + ' in RSS feed</span>';
      }
    }
    el.innerHTML = h;
  }

  // Get filtered incidents
  function getFilteredIncidents() {
    if (healthActiveFilter === 'all') return healthIncidents;
    return healthIncidents.slice().sort(function (a, b) {
      if (healthActiveFilter === 'region') return a.region.name.localeCompare(b.region.name);
      return a.service.localeCompare(b.service);
    });
  }

  // Group incidents by key
  function groupIncidents(incidents, key) {
    var groups = {};
    var order = [];
    incidents.forEach(function (inc) {
      var k = key === 'region' ? inc.region.name : inc.service;
      if (!groups[k]) { groups[k] = []; order.push(k); }
      groups[k].push(inc);
    });
    return { groups: groups, order: order };
  }

  // Render a single incident card
  function renderIncidentCard(inc, idx) {
    var h = '<div class="health-incident-card health-incident-card--' + inc.severityColor + '" data-card-idx="' + idx + '" role="button" tabindex="0" aria-expanded="false">';
    h += '<div class="health-incident-card__header">';
    h += '<span class="health-incident-card__service">' + esc(inc.service) + '</span>';
    h += '<div style="display:flex;align-items:center;gap:6px">';
    h += '<span class="health-incident-card__severity health-incident-card__severity--' + inc.severity + '">' + esc(inc.severityLabel) + '</span>';
    h += '<svg class="health-incident-card__chevron" width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    h += '</div>';
    h += '</div>';
    h += '<div class="health-incident-card__badges">';
    if (inc.region.code) {
      h += '<span class="health-incident-card__badge health-incident-card__badge--region">' + esc(inc.region.code) + ' · ' + esc(inc.region.name) + '</span>';
    } else {
      h += '<span class="health-incident-card__badge health-incident-card__badge--region">' + esc(inc.region.name) + '</span>';
    }
    h += '</div>';
    if (inc.summary) {
      h += '<div class="health-incident-card__desc">' + esc(inc.summary) + '</div>';
    }
    // Expanded detail section (hidden by default)
    h += '<div class="health-incident-card__detail">';
    if (inc.title) {
      h += '<div class="health-incident-card__detail-row"><span class="health-incident-card__detail-label">Event</span><span>' + esc(inc.title) + '</span></div>';
    }
    if (inc.region.code) {
      h += '<div class="health-incident-card__detail-row"><span class="health-incident-card__detail-label">Region</span><span>' + esc(inc.region.name) + ' (' + esc(inc.region.code) + ')</span></div>';
    }
    if (inc.updatedAt) {
      h += '<div class="health-incident-card__detail-row"><span class="health-incident-card__detail-label">Last update</span><span>' + inc.updatedAt.toLocaleString() + ' (' + healthTimeAgo(inc.updatedAt) + ')</span></div>';
    }
    if (inc.severityLabel) {
      h += '<div class="health-incident-card__detail-row"><span class="health-incident-card__detail-label">Severity</span><span>' + esc(inc.severityLabel) + '</span></div>';
    }
    if (inc.sourceUrl) {
      h += '<div class="health-incident-card__detail-row"><a href="' + esc(inc.sourceUrl) + '" target="_blank" rel="noopener" class="health-incident-card__detail-link">View on AWS Status Page →</a></div>';
    }
    h += '</div>';
    if (inc.updatedAt) {
      h += '<div class="health-incident-card__time">' + healthTimeAgo(inc.updatedAt) + '</div>';
    }
    h += '</div>';
    return h;
  }

  // Render the grid of incident cards
  function renderHealthGrid() {
    var grid = document.getElementById('health-grid');
    var filters = document.getElementById('health-filters');
    if (!grid) return;

    // Loading state
    if (healthState === 'loading') {
      grid.innerHTML = '<div class="health-skeleton">' +
        '<div class="health-skeleton__row"><div class="health-skeleton__block"></div><div class="health-skeleton__block"></div></div>' +
        '<div class="health-skeleton__row"><div class="health-skeleton__block"></div><div class="health-skeleton__block"></div></div>' +
        '</div>';
      if (filters) filters.style.display = 'none';
      return;
    }

    // Error state
    if (healthState === 'error' && healthIncidents.length === 0) {
      grid.innerHTML = '<div class="health-error">' +
        '<div class="health-error__icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></div>' +
        '<div class="health-error__title">Could not retrieve the public RSS feed</div>' +
        '<div class="health-error__desc">The RSS feed at status.aws.amazon.com could not be reached. Check the official pages directly for current status.</div>' +
        '<div class="health-error__actions">' +
        '<button class="health-error__btn health-error__btn--retry" onclick="fetchHealthStatus()">Retry</button>' +
        '<a href="https://health.aws.amazon.com/health/status" target="_blank" rel="noopener" class="health-error__btn health-error__btn--link">Health Dashboard</a>' +
        '<a href="https://status.aws.amazon.com/" target="_blank" rel="noopener" class="health-error__btn health-error__btn--link">Public Status Page</a>' +
        '</div></div>';
      if (filters) filters.style.display = 'none';
      return;
    }

    // Empty state (no incidents)
    if (healthIncidents.length === 0) {
      grid.innerHTML = '<div class="health-empty">' +
        '<div class="health-empty__icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></div>' +
        '<div class="health-empty__title">No events in RSS feed</div>' +
        '<div class="health-empty__desc">The public AWS RSS feed contains no active disruption entries. This may not reflect all events — check the <a href="https://health.aws.amazon.com/health/status" target="_blank" rel="noopener" style="color:var(--bll)">AWS Health Dashboard</a> for your account-specific events.</div>' +
        '</div>';
      if (filters) filters.style.display = 'none';
      return;
    }

    // Show filters
    if (filters) filters.style.display = '';

    // Cached data banner
    var h = '';
    if (healthFromCache) {
      h += '<div class="health-cached-banner"><svg width="12" height="12" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.2"/><path d="M8 5v3M8 10v.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg> Showing cached RSS data — live fetch failed. Click refresh to retry.</div>';
    }

    var filtered = getFilteredIncidents();

    if (healthActiveFilter !== 'all') {
      var key = healthActiveFilter === 'region' ? 'region' : 'service';
      var grouped = groupIncidents(filtered, key);
      grouped.order.forEach(function (groupName) {
        h += '<div class="health-region-group">';
        h += '<div class="health-region-group__title">' + esc(groupName) + '</div>';
        h += '<div class="health-incidents-grid">';
        grouped.groups[groupName].forEach(function (inc, i) { h += renderIncidentCard(inc, groupName + '-' + i); });
        h += '</div></div>';
      });
    } else {
      h += '<div class="health-incidents-grid">';
      filtered.forEach(function (inc, i) { h += renderIncidentCard(inc, i); });
      h += '</div>';
    }

    grid.innerHTML = h;
  }

  // Main render orchestrator
  function renderHealthPanel() {
    var iconState;
    if (healthState === 'loading') iconState = 'loading';
    else if (healthState === 'error') iconState = 'error';
    else if (healthIncidents.length > 0) iconState = 'incidents';
    else if (healthFetchSuccess) iconState = 'ok';
    else iconState = 'error'; // fetch didn't succeed — don't show green
    updateHealthIcon(iconState);
    updateHealthTimestamp();
    renderHealthSummary();
    renderHealthGrid();
  }

  // Wire filter chips
  function wireHealthFilters() {
    var container = document.getElementById('health-filters');
    if (!container) return;
    container.addEventListener('click', function (e) {
      var chip = e.target.closest('.health-chip');
      if (!chip) return;
      healthActiveFilter = chip.getAttribute('data-filter') || 'all';
      container.querySelectorAll('.health-chip').forEach(function (c) { c.classList.remove('health-chip--active'); });
      chip.classList.add('health-chip--active');
      renderHealthGrid();
    });
  }

  // Wire refresh button
  function wireHealthRefresh() {
    var btn = document.getElementById('health-refresh-btn');
    if (!btn) return;
    btn.addEventListener('click', function () {
      btn.classList.add('health-panel__refresh-btn--spinning');
      renderRssStatus(null); // show "checking..." on refresh
      checkAwsHealthRSS().then(renderRssStatus);
      fetchHealthStatus().finally(function () {
        btn.classList.remove('health-panel__refresh-btn--spinning');
      });
    });
  }

  // Wire card expand/collapse via event delegation on the grid
  function wireHealthCardExpand() {
    var grid = document.getElementById('health-grid');
    if (!grid) return;
    grid.addEventListener('click', function (e) {
      // Don't toggle if clicking a link inside the detail
      if (e.target.closest('a')) return;
      var card = e.target.closest('.health-incident-card');
      if (!card) return;
      var isExpanded = card.getAttribute('aria-expanded') === 'true';
      card.setAttribute('aria-expanded', isExpanded ? 'false' : 'true');
      card.classList.toggle('health-incident-card--expanded', !isExpanded);
    });
    grid.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var card = e.target.closest('.health-incident-card');
      if (!card) return;
      e.preventDefault();
      var isExpanded = card.getAttribute('aria-expanded') === 'true';
      card.setAttribute('aria-expanded', isExpanded ? 'false' : 'true');
      card.classList.toggle('health-incident-card--expanded', !isExpanded);
    });
  }

  // ── Hardcoded fallback removed ──
  // The tool relies solely on live RSS feed + short-TTL cache.
  // If all fetches fail and no cache exists, the panel shows a clear error state.
  var FALLBACK_INCIDENTS = [];
  var FALLBACK_VERIFIED_DATE = '2026-03-11';

  // No-cache fetch options — use cache:'no-store' only (custom headers trigger CORS preflight on proxies)
  var HEALTH_FETCH_OPTS = {
    cache: 'no-store'
  };

  // CORS proxy list — use only the most reliable proxies
  // Each proxy returns { url, extract, name } for logging
  var CORS_PROXIES = [
    // allorigins — JSON wrapper
    function (url) { return { url: 'https://api.allorigins.win/get?url=' + encodeURIComponent(url), extract: function (d) { return d && d.contents; }, name: 'allorigins' }; },
    // corsproxy.io — requires ?url= prefix
    function (url) { return { url: 'https://corsproxy.io/?url=' + encodeURIComponent(url), extract: function (d) { return d; }, name: 'corsproxy' }; },
    // cors.lol — simple passthrough
    function (url) { return { url: 'https://api.cors.lol/?url=' + encodeURIComponent(url), extract: function (d) { return d; }, name: 'corslol' }; }
  ];

  // Append a cache-busting timestamp to a URL
  function cacheBustUrl(url) {
    var sep = url.indexOf('?') >= 0 ? '&' : '?';
    return url + sep + '_t=' + Date.now();
  }

  // Try fetching via proxy chain
  function fetchWithProxy(url, proxyIndex) {
    proxyIndex = proxyIndex || 0;
    if (proxyIndex >= CORS_PROXIES.length) return Promise.reject(new Error('All proxies failed'));
    var proxy = CORS_PROXIES[proxyIndex](url);
    var isJsonProxy = proxyIndex === 0; // allorigins returns JSON
    var opts = Object.assign({}, HEALTH_FETCH_OPTS, { signal: AbortSignal.timeout(5000) });
    if (HEALTH_DEBUG) healthLog('Trying proxy: ' + proxy.name + ' → ' + proxy.url);
    return fetch(proxy.url, opts)
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return isJsonProxy ? res.json() : res.text();
      })
      .then(function (data) {
        var content = isJsonProxy ? proxy.extract(data) : data;
        if (!content || (typeof content === 'string' && content.length < 100)) throw new Error('Empty');
        if (typeof content === 'string' && content.indexOf('<item>') < 0 && content.indexOf('<item ') < 0) throw new Error('Not RSS');
        // Reject HTML landing pages that proxies return when they fail silently
        if (typeof content === 'string' && content.indexOf('<!DOCTYPE') >= 0) throw new Error('HTML page, not RSS');
        if (typeof content === 'string' && content.indexOf('<html') >= 0 && content.indexOf('<rss') < 0 && content.indexOf('<channel') < 0) throw new Error('HTML page, not RSS');
        healthFetchSource = 'proxy:' + proxy.name;
        healthDebugLog.lastFetchSource = healthFetchSource;
        healthDebugLog.lastResponseLength = typeof content === 'string' ? content.length : 0;
        healthLog('Success via proxy: ' + proxy.name + ' (' + healthDebugLog.lastResponseLength + ' bytes)');
        return content;
      })
      .catch(function (err) {
        if (HEALTH_DEBUG) healthLog('Proxy ' + proxy.name + ' failed: ' + err.message);
        return fetchWithProxy(url, proxyIndex + 1);
      });
  }

  // Direct fetch (works if page is served from same origin or CORS is allowed)
  function fetchDirect(url) {
    var opts = Object.assign({}, HEALTH_FETCH_OPTS, { signal: AbortSignal.timeout(5000) });
    if (HEALTH_DEBUG) healthLog('Trying direct fetch: ' + url);
    return fetch(url, opts)
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.text();
      })
      .then(function (text) {
        if (!text || text.length < 100 || text.indexOf('<item') < 0) throw new Error('Not RSS');
        if (text.indexOf('<!DOCTYPE') >= 0 || (text.indexOf('<html') >= 0 && text.indexOf('<rss') < 0)) throw new Error('HTML page, not RSS');
        healthFetchSource = 'direct';
        healthDebugLog.lastFetchSource = 'direct';
        healthDebugLog.lastResponseLength = text.length;
        healthLog('Success via direct fetch (' + text.length + ' bytes)');
        return text;
      });
  }

  // ── RSS Health Check (lightweight item-count probe) ──
  function checkAwsHealthRSS() {
    var controller = new AbortController();
    var timeoutId = setTimeout(function () { controller.abort(); }, 10000);
    var feedUrl = 'https://status.aws.amazon.com/rss/all.rss';
    // Try direct first (works when served from a local/hosted server), then proxy fallback
    return fetch(feedUrl, { signal: controller.signal })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.text();
      })
      .then(function (text) {
        if (!text || text.indexOf('<item') < 0 || text.indexOf('<html') >= 0) throw new Error('Not RSS');
        return text;
      })
      .catch(function () {
        // Direct failed (likely CORS from file://), try allorigins proxy
        var proxyUrl = 'https://api.allorigins.win/get?url=' + encodeURIComponent(feedUrl);
        return fetch(proxyUrl, { signal: controller.signal })
          .then(function (res) {
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.json();
          })
          .then(function (data) {
            var content = (data && data.contents) || '';
            if (!content || content.indexOf('<item') < 0 || content.indexOf('<html') >= 0) throw new Error('Not RSS');
            return content;
          });
      })
      .catch(function () {
        // allorigins failed, try corsproxy.io
        var proxyUrl2 = 'https://corsproxy.io/?url=' + encodeURIComponent(feedUrl);
        return fetch(proxyUrl2, { signal: controller.signal })
          .then(function (res) {
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.text();
          })
          .then(function (text) {
            if (!text || text.indexOf('<item') < 0 || text.indexOf('<html') >= 0) throw new Error('Not RSS');
            return text;
          });
      })
      .then(function (rssText) {
        clearTimeout(timeoutId);
        var count = (rssText.match(/<item>/g) || []).length;
        return { success: true, itemCount: count, source: 'aws-status-rss' };
      })
      .catch(function () {
        clearTimeout(timeoutId);
        return { success: false, error: 'RSS fetch failed' };
      });
  }

  // Update the RSS status indicator in the health panel
  function renderRssStatus(result) {
    var el = document.getElementById('health-rss-status');
    if (!el) return;
    if (!result) {
      el.innerHTML = '<span class="health-summary-badge health-summary-badge--blue">' +
        '<span class="health-summary-dot health-summary-dot--blue"></span>' +
        'Checking AWS Status Feed\u2026</span>';
      return;
    }
    if (result.success) {
      el.innerHTML = '<span class="health-summary-badge health-summary-badge--green">' +
        '<span class="health-summary-dot health-summary-dot--green"></span>' +
        'AWS Status Feed reachable &nbsp;·&nbsp; ' + result.itemCount + ' total RSS entries' +
        '</span>';
    } else {
      el.innerHTML = '<span class="health-summary-badge health-summary-badge--grey">' +
        '<span class="health-summary-dot health-summary-dot--grey"></span>' +
        'AWS Status Feed unavailable</span>';
    }
  }

  // Main fetch function
  function fetchHealthStatus() {
    var refreshBtn = document.getElementById('health-refresh-btn');
    if (refreshBtn) refreshBtn.classList.add('health-panel__refresh-btn--spinning');

    // Reset debug log for this cycle
    healthDebugLog.error = null;
    healthDebugLog.cacheHit = false;
    healthFetchSource = '';
    healthFetchSuccess = false;

    // Generate a single cache-busted URL for this fetch cycle
    var feedUrl = cacheBustUrl('https://status.aws.amazon.com/rss/all.rss');
    healthDebugLog.lastFetchUrl = feedUrl;
    healthDebugLog.lastFetchTimestamp = new Date();
    healthLog('Fetching: ' + feedUrl);

    // Try direct first, then proxies, then cache fallback
    return fetchDirect(feedUrl)
      .catch(function () {
        return fetchWithProxy(feedUrl);
      })
      .then(function (xml) {
        var incidents = parseHealthRSS(xml);
        healthDebugLog.lastRenderedCount = incidents.length;
        healthLog('Live feed: ' + incidents.length + ' incident(s) via ' + healthFetchSource);
        // Always replace with live data — trust the feed
        healthIncidents = incidents;
        healthState = incidents.length > 0 ? 'incidents' : 'ok';
        healthLastUpdated = new Date();
        healthFromCache = false;
        healthFetchSuccess = true;
        saveHealthCache(incidents);
        renderHealthPanel();
      })
      .catch(function (err) {
        healthDebugLog.error = err ? err.message : 'unknown';
        // Try loading from localStorage cache (even if expired, as last resort)
        var cached = loadHealthCacheAnyAge();
        if (cached && cached.incidents && cached.incidents.length > 0) {
          healthIncidents = cached.incidents.map(function (inc) {
            if (inc.updatedAt) inc.updatedAt = new Date(inc.updatedAt);
            return inc;
          });
          healthState = healthIncidents.length > 0 ? 'incidents' : 'ok';
          healthLastUpdated = new Date(cached.timestamp);
          healthFromCache = true;
          healthFetchSource = 'cache';
          healthFetchSuccess = true;
          healthDebugLog.lastFetchSource = 'cache';
          healthDebugLog.cacheHit = true;
          healthDebugLog.lastRenderedCount = healthIncidents.length;
          healthLog('Using cached data (' + healthIncidents.length + ' incidents, from ' + new Date(cached.timestamp).toISOString() + ')');
          renderHealthPanel();
          return;
        }
        // Nothing available
        healthIncidents = [];
        healthState = 'error';
        healthFromCache = false;
        healthFetchSource = 'error';
        healthDebugLog.lastFetchSource = 'error';
        healthDebugLog.lastRenderedCount = 0;
        healthLog('All fetch attempts failed, no cache available');
        renderHealthPanel();
      })
      .finally(function () {
        if (refreshBtn) refreshBtn.classList.remove('health-panel__refresh-btn--spinning');
        if (HEALTH_DEBUG) {
          healthLog('Debug: ' + JSON.stringify(healthDebugLog));
        }
      });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  // ============================================================
  // Expose internals for testing
  // ============================================================
  window.WIZARD_STEPS = WIZARD_STEPS;
  window.REGIONAL_PARTNERS = REGIONAL_PARTNERS;
  window.REGIONAL_COMPARISON_ROWS = REGIONAL_COMPARISON_ROWS;
  window.MATCHMAKING_ENGINE = MATCHMAKING_ENGINE;
  window.RULES_ENGINE = RULES_ENGINE;
  window.generateArchSvg = generateArchSvg;
  window.generateMarkdown = generateMarkdown;
  window.copySummary = copySummary;
  window.showResults = showResults;
  window.renderPartnerEngagementGuide = renderPartnerEngagementGuide;
  window.renderStep = renderStep;
  window.isStepVisible = isStepVisible;
  window.getVisibleStepInfo = getVisibleStepInfo;
  window.fetchHealthStatus = fetchHealthStatus;
  window.checkAwsHealthRSS = checkAwsHealthRSS;
  window.renderRssStatus = renderRssStatus;
  window.healthDebugLog = healthDebugLog;
  window.downloadDiscoveryScript = downloadDiscoveryScript;
  window.DISCOVERY_SCRIPT_CONTENT = DISCOVERY_SCRIPT_CONTENT;

  // State management shim for tests
  window.RMA = {
    getState: function () { return state; },
    setState: function (s) { state = s; },
    getCurrentStep: function () { return currentStep; },
    setCurrentStep: function (s) { currentStep = s; },
    setStep: function (s) { currentStep = s; },
    initDom: initDom,
    saveState: saveState,
    loadState: loadState,
    clearState: clearState,
    restart: restart,
    editAnswers: editAnswers
  };

  // Legacy compatibility shims for older spec tests
  window.generateStrategyMap = generateArchSvg;
  window.STEPS = WIZARD_STEPS.filter(function (s) {
    return !s.conditional || s.conditional({ proceedPath: 'self-execution', urgencyMode: 'architecture-strategy', dataProfile: 'stateful-large' });
  });
  window.BranchLogic = {
    getRecommendedArchitecture: function (s) {
      s.urgencyMode = 'architecture-strategy';
      return RULES_ENGINE.getArchitecture(s);
    },
    getRelevantSections: function (s) {
      // Simplified: return section IDs based on state
      var sections = ['overview', 'region-enablement', 'aws-support', 'pre-migration', 'service-quotas',
        'kms', 'iam-idc', 'iam-sts', 'amazon-ec2', 'amazon-ecs', 'amazon-eks',
        'amazon-rds', 'amazon-aurora', 'amazon-redshift', 'elasticache', 'alb-nlb',
        'site-to-site-vpn', 'direct-connect', 'transit-gateway', 'client-vpn',
        'amazon-s3', 'aws-waf', 'checklist', 'wave-planner', 'decision-matrix',
        'talk-track', 'faq'];
      if (s.networkConnectivity === 'vpn-only') {
        sections = sections.filter(function (id) { return id !== 'direct-connect'; });
      }
      if (s.dataProfile === 'stateless') {
        sections = sections.filter(function (id) { return ['amazon-rds', 'amazon-aurora', 'amazon-redshift', 'elasticache'].indexOf(id) === -1; });
      }
      return sections;
    },
    getVisibleSteps: function (s) {
      // Return architecture-strategy steps for backward compat
      return WIZARD_STEPS.filter(function (step) {
        if (!step.conditional) return true;
        var testState = Object.assign({ proceedPath: 'self-execution', urgencyMode: 'architecture-strategy', dataProfile: 'stateful-large' }, s);
        return step.conditional(testState);
      });
    },
    getComplexityScore: function (s) {
      s.urgencyMode = 'architecture-strategy';
      return RULES_ENGINE.getComplexity(s);
    }
  };
  window.StateManager = {
    STORAGE_KEY: 'rma-advisor-state',
    _state: state,
    get: function (k) { return state[k]; },
    set: function (k, v) { state[k] = v; saveState(); },
    getAll: function () { return Object.assign({}, state); },
    clear: function () { clearState(); },
    restore: function () { return loadState(); }
  };
})();

# infra/waf/terraform-stub.tf
# Terraform configuration stub for attaching WAF WebACL to CloudFront distribution
# This is a TEMPLATE - customize with your actual values before applying

# IMPORTANT: This file is commented out by default
# Uncomment and customize before use

/*
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"  # WAF for CloudFront must be in us-east-1
}

# Reference existing CloudFront distribution
data "aws_cloudfront_distribution" "main" {
  id = var.cloudfront_distribution_id
}

# Create WAF WebACL with allow rules for SPA assets
resource "aws_wafv2_web_acl" "spa_protection" {
  name        = "valine-spa-protection"
  description = "WAF rules for Valine SPA with asset allow rules"
  scope       = "CLOUDFRONT"

  default_action {
    allow {}  # Start permissive, add blocks incrementally
  }

  # Rule 1: Allow static assets
  rule {
    name     = "AllowStaticAssets"
    priority = 100

    action {
      allow {}
    }

    statement {
      byte_match_statement {
        field_to_match {
          uri_path {}
        }
        positional_constraint = "STARTS_WITH"
        search_string         = "/assets/"
        text_transformation {
          priority = 0
          type     = "NONE"
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AllowStaticAssets"
      sampled_requests_enabled   = true
    }
  }

  # Rule 2: Allow theme init script
  rule {
    name     = "AllowThemeInit"
    priority = 110

    action {
      allow {}
    }

    statement {
      byte_match_statement {
        field_to_match {
          uri_path {}
        }
        positional_constraint = "EXACTLY"
        search_string         = "/theme-init.js"
        text_transformation {
          priority = 0
          type     = "NONE"
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AllowThemeInit"
      sampled_requests_enabled   = true
    }
  }

  # Rule 3: Allow API endpoints (with rate limiting)
  rule {
    name     = "AllowAPIWithRateLimit"
    priority = 200

    action {
      allow {}
    }

    statement {
      rate_based_statement {
        limit              = 2000
        aggregate_key_type = "IP"

        scope_down_statement {
          byte_match_statement {
            field_to_match {
              uri_path {}
            }
            positional_constraint = "STARTS_WITH"
            search_string         = "/api/"
            text_transformation {
              priority = 0
              type     = "NONE"
            }
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AllowAPIWithRateLimit"
      sampled_requests_enabled   = true
    }
  }

  # Rule 4: AWS Managed - SQL Injection Protection
  rule {
    name     = "AWSManagedRulesSQLi"
    priority = 1000

    override_action {
      count {}  # Start in COUNT mode, switch to none {} to enable blocking
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesSQLiRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesSQLi"
      sampled_requests_enabled   = true
    }
  }

  # Rule 5: AWS Managed - Known Bad Inputs
  rule {
    name     = "AWSManagedRulesKnownBadInputs"
    priority = 1010

    override_action {
      count {}  # Start in COUNT mode
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesKnownBadInputs"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "ValineSPAProtection"
    sampled_requests_enabled   = true
  }

  tags = {
    Name        = "valine-spa-waf"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Associate WebACL with CloudFront distribution
resource "aws_cloudfront_distribution" "main_with_waf" {
  # Copy all existing distribution config from data source
  # This is a simplified example - in practice, you'd reference your existing distribution config

  web_acl_id = aws_wafv2_web_acl.spa_protection.arn

  # ... rest of distribution configuration ...
}

# CloudWatch Alarms for WAF monitoring
resource "aws_cloudwatch_metric_alarm" "waf_blocked_requests_spike" {
  alarm_name          = "waf-blocked-requests-spike"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "BlockedRequests"
  namespace           = "AWS/WAFV2"
  period              = "300"  # 5 minutes
  statistic           = "Sum"
  threshold           = "100"
  alarm_description   = "Alert when WAF blocks more than 100 requests in 5 minutes"
  treat_missing_data  = "notBreaching"

  dimensions = {
    WebACL = aws_wafv2_web_acl.spa_protection.name
    Region = "us-east-1"
    Rule   = "ALL"
  }

  # alarm_actions = [var.sns_topic_arn]  # Uncomment and provide SNS topic
}

# Variables
variable "cloudfront_distribution_id" {
  description = "CloudFront distribution ID to attach WAF to"
  type        = string
}

variable "environment" {
  description = "Environment name (e.g., production, staging)"
  type        = string
  default     = "production"
}

# Outputs
output "web_acl_id" {
  description = "WAF WebACL ID"
  value       = aws_wafv2_web_acl.spa_protection.id
}

output "web_acl_arn" {
  description = "WAF WebACL ARN for CloudFront association"
  value       = aws_wafv2_web_acl.spa_protection.arn
}
*/

# To use this configuration:
# 1. Uncomment the entire file
# 2. Set cloudfront_distribution_id variable
# 3. Review and customize rules
# 4. Run: terraform plan
# 5. Review plan output carefully
# 6. Run: terraform apply (only after approval)

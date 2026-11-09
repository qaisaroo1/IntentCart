"""
Policy Engine (The Guardrail / Bouncer) for IntentCart.

Why this exists:
LLMs (AI) can hallucinate, ignore instructions, or recommend items that violate
financial limits. The Policy Engine is a deterministic (100% predictable) Python
verification layer. It intercepts any product recommendation before it reaches
the user or the payment gateway, strictly enforcing rules.
"""

from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field


@dataclass
class RuleCheck:
    """Represents a single policy check result for transparency and auditing."""
    rule_id: str
    rule_name: str
    passed: bool
    message: str
    details: Dict[str, Any] = field(default_factory=dict)


@dataclass
class PolicyEvaluation:
    """The complete result of evaluating a product against user constraints."""
    product_id: str
    product_name: str
    passed: bool
    total_cost: float
    checks: List[RuleCheck] = field(default_factory=list)
    violations: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "product_id": self.product_id,
            "product_name": self.product_name,
            "passed": self.passed,
            "total_cost": self.total_cost,
            "violations": self.violations,
            "checks": [
                {
                    "rule_id": c.rule_id,
                    "rule_name": c.rule_name,
                    "passed": c.passed,
                    "message": c.message,
                    "details": c.details
                }
                for c in self.checks
            ]
        }


class PolicyEngine:
    """
    Deterministic rule engine that validates products against user-defined constraints.
    """

    def __init__(
        self,
        max_budget: float,
        require_in_stock: bool = True,
        max_shipping_fee: float = 50.0,
        allowed_categories: Optional[List[str]] = None
    ):
        self.max_budget = float(max_budget)
        self.require_in_stock = require_in_stock
        self.max_shipping_fee = float(max_shipping_fee)
        self.allowed_categories = [c.lower() for c in allowed_categories] if allowed_categories else None

    def evaluate(self, product: Dict[str, Any]) -> PolicyEvaluation:
        """
        Evaluate a single product against all active policy rules.
        """
        checks: List[RuleCheck] = []
        violations: List[str] = []

        item_price = float(product.get("price", 0.0))
        shipping_fee = float(product.get("shipping_fee", 0.0))
        total_cost = round(item_price + shipping_fee, 2)

        # -------------------------------------------------------------
        # Rule 1: Strict Total Cost vs. Budget Limit
        # -------------------------------------------------------------
        budget_passed = total_cost <= self.max_budget
        checks.append(RuleCheck(
            rule_id="RULE-BUDGET-001",
            rule_name="Budget Limit Check",
            passed=budget_passed,
            message=(
                f"Total cost ${total_cost:.2f} (item: ${item_price:.2f} + shipping: ${shipping_fee:.2f}) "
                f"is within budget of ${self.max_budget:.2f}"
                if budget_passed
                else f"REJECTED: Total cost ${total_cost:.2f} exceeds max budget of ${self.max_budget:.2f} by ${total_cost - self.max_budget:.2f}"
            ),
            details={
                "item_price": item_price,
                "shipping_fee": shipping_fee,
                "total_cost": total_cost,
                "max_budget": self.max_budget
            }
        ))
        if not budget_passed:
            violations.append(f"Exceeds budget: ${total_cost:.2f} > ${self.max_budget:.2f}")

        # -------------------------------------------------------------
        # Rule 2: Inventory Availability Check
        # -------------------------------------------------------------
        in_stock = bool(product.get("in_stock", False))
        if self.require_in_stock:
            checks.append(RuleCheck(
                rule_id="RULE-STOCK-002",
                rule_name="Inventory Stock Check",
                passed=in_stock,
                message="Product is confirmed in stock" if in_stock else "REJECTED: Product is currently out of stock",
                details={"in_stock": in_stock}
            ))
            if not in_stock:
                violations.append("Product is out of stock")

        # -------------------------------------------------------------
        # Rule 3: Shipping Fee Threshold Check
        # -------------------------------------------------------------
        shipping_passed = shipping_fee <= self.max_shipping_fee
        checks.append(RuleCheck(
            rule_id="RULE-SHIPPING-003",
            rule_name="Shipping Threshold Check",
            passed=shipping_passed,
            message=(
                f"Shipping fee ${shipping_fee:.2f} is under allowed max ${self.max_shipping_fee:.2f}"
                if shipping_passed
                else f"REJECTED: Excessive shipping fee ${shipping_fee:.2f} (limit is ${self.max_shipping_fee:.2f})"
            ),
            details={"shipping_fee": shipping_fee, "max_allowed": self.max_shipping_fee}
        ))
        if not shipping_passed:
            violations.append(f"Excessive shipping fee: ${shipping_fee:.2f}")

        # -------------------------------------------------------------
        # Rule 4: Category Alignment Check (Optional)
        # -------------------------------------------------------------
        if self.allowed_categories:
            product_category = str(product.get("category", "")).lower()
            category_passed = product_category in self.allowed_categories
            checks.append(RuleCheck(
                rule_id="RULE-CATEGORY-004",
                rule_name="Product Category Filter",
                passed=category_passed,
                message=(
                    f"Category '{product_category}' matches request"
                    if category_passed
                    else f"REJECTED: Category '{product_category}' does not match requested categories {self.allowed_categories}"
                ),
                details={"category": product_category, "allowed": self.allowed_categories}
            ))
            if not category_passed:
                violations.append(f"Category mismatch: {product_category}")

        all_passed = len(violations) == 0

        return PolicyEvaluation(
            product_id=str(product.get("id", "unknown")),
            product_name=str(product.get("name", "Unknown Product")),
            passed=all_passed,
            total_cost=total_cost,
            checks=checks,
            violations=violations
        )


# =====================================================================
# Standalone Quick Test (Run this directly to see it in action!)
# =====================================================================
if __name__ == "__main__":
    import json
    from pathlib import Path

    print("=" * 65)
    print("      INTENTCART POLICY ENGINE - STANDALONE TEST RUNNER")
    print("=" * 65)

    catalog_path = Path(__file__).resolve().parent.parent / "data" / "catalog.json"
    with open(catalog_path, "r", encoding="utf-8") as f:
        catalog = json.load(f)

    # Let's simulate a user with a strict $700 budget looking for a laptop
    user_budget = 700.00
    engine = PolicyEngine(max_budget=user_budget, allowed_categories=["laptop"])

    print(f"\nUser Policy: Max Budget = ${user_budget:.2f} | Category = Laptop\n")

    for item in catalog[:4]:  # Test first 4 items
        result = engine.evaluate(item)
        status_icon = "PASS" if result.passed else "FAIL"
        print(f"[{status_icon}] {result.product_name} (${result.total_cost:.2f})")
        for check in result.checks:
            mark = "   [OK]" if check.passed else "   [X] "
            print(f"{mark} {check.rule_name}: {check.message}")
        print("-" * 65)

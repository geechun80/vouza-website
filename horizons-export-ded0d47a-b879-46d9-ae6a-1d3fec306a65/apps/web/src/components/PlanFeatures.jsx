import React from 'react';
import { Check, Minus } from 'lucide-react';

/**
 * Renders one plan's capability rows from lib/plans.js. Shared by the public
 * PricingPage and the in-app DashboardPage so the two can't describe the same
 * plan differently.
 *
 * Rows the plan doesn't include are shown dimmed rather than hidden — the
 * capability matrix is easier to compare across plans when every plan lists
 * the same rows in the same order.
 */
const PlanFeatures = ({ features, className = '' }) => (
  <ul className={`space-y-2.5 ${className}`}>
    {features.map((feature) => {
      const excluded = feature.value === false;

      return (
        <li
          key={feature.label}
          className={`flex items-baseline gap-2.5 text-sm ${excluded ? 'opacity-40' : ''}`}
        >
          {excluded ? (
            <Minus className="w-4 h-4 shrink-0 translate-y-0.5 text-muted-foreground" aria-hidden="true" />
          ) : (
            <Check className="w-4 h-4 shrink-0 translate-y-0.5 text-primary" aria-hidden="true" />
          )}
          <span className="flex-1 text-foreground/80 leading-relaxed">{feature.label}</span>
          {typeof feature.value === 'string' && (
            <span className="shrink-0 text-right font-medium text-foreground">{feature.value}</span>
          )}
          {excluded && <span className="sr-only">not included</span>}
        </li>
      );
    })}
  </ul>
);

export default PlanFeatures;

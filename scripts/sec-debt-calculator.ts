type SecFactValue = {
  val: number;
  end?: string;
  start?: string;
  filed?: string;
  form?: string;
  frame?: string;
};

type SecFact = {
  label?: string;
  units?: Record<string, SecFactValue[]>;
};

export type DebtComponent = {
  concept: string;
  label: string | null;
  value: number;
  unit: string;
  periodEnd: string;
  filed: string | null;
  form: string | null;
};

function getLatestValueForPeriod(
  fact: SecFact,
  periodEnd: string
): DebtComponent | null {
  if (!fact.units) {
    return null;
  }

  for (const [unit, values] of Object.entries(
    fact.units
  )) {
    const matchingValues = values
      .filter(
        (value) =>
          value.end === periodEnd
      )
      .sort((a, b) =>
        String(b.filed ?? "").localeCompare(
          String(a.filed ?? "")
        )
      );

    if (matchingValues.length === 0) {
      continue;
    }

    const latest =
      matchingValues[0];

    return {
      concept: "",
      label: fact.label ?? null,
      value: latest.val,
      unit,
      periodEnd,
      filed: latest.filed ?? null,
      form: latest.form ?? null,
    };
  }

  return null;
}

export function calculateDebtForPeriod(
  usGaap: Record<string, SecFact>,
  concepts: readonly string[],
  periodEnd: string
) {
  const components: DebtComponent[] = [];

  /*
   * LongTermDebt is an aggregate.
   *
   * Therefore we use it instead of:
   * LongTermDebtCurrent +
   * LongTermDebtNoncurrent
   */
  const aggregateConcept =
    "LongTermDebt";

  if (concepts.includes(aggregateConcept)) {
    const fact =
      usGaap[aggregateConcept];

    if (fact) {
      const result =
        getLatestValueForPeriod(
          fact,
          periodEnd
        );

      if (result) {
        components.push({
          ...result,
          concept: aggregateConcept,
        });
      }
    }
  }

  /*
   * CommercialPaper is separate from
   * Apple's term debt.
   */
  const additionalConcepts = [
    "CommercialPaper",
  ];

  for (const concept of additionalConcepts) {
    if (!concepts.includes(concept)) {
      continue;
    }

    const fact = usGaap[concept];

    if (!fact) {
      continue;
    }

    const result =
      getLatestValueForPeriod(
        fact,
        periodEnd
      );

    if (!result) {
      continue;
    }

    components.push({
      ...result,
      concept,
    });
  }

  const total = components.reduce(
    (sum, component) =>
      sum + component.value,
    0
  );

  return {
    periodEnd,
    components,
    total,
    calculationMode:
      "aggregate_plus_additional",
  };
}
export type StrongAnonymityDisclosure = Readonly<{
  readonly guaranteeStatement: string;
  readonly trustAssumptions: ReadonlyArray<string>;
}>;

const trustAssumptions = [
  'Client runtime integrity controls remain in place on the employee device.',
  'Published artifact hashes and source repository contents are independently verifiable by reviewers.',
  'Trust-separated operational controls (build, policy publication, and runtime operation) do not collude to falsify evidence.'
] as const;

export const buildStrongAnonymityDisclosure = (): StrongAnonymityDisclosure => ({
  guaranteeStatement:
    'Response unlinkability is computationally infeasible under vetted cryptographic primitives and explicit trust assumptions.',
  trustAssumptions
});

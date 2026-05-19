// Marker component kept at the route level for readability. The attack FX
// runtime creates and removes its overlay imperatively only while an attack is
// playing; route entry mounts no idle full-screen canvas or WebGL context.
export function AttackFxLayer(): null {
  return null;
}

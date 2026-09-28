# MERCHANT_WEB_EIAM_INTEGRATION.md
## Guía de Integración con EIAM SDK en Web

## 🔑 1. Consumo del SDK EIAM desde React
El portal `merchant-web` utiliza el SDK de EIAM a través de la capa `services/eiamService.ts` y la guardia `<ProtectedRoute>`:

```typescript
// Ejemplo de guardia de ruta basada en permisos EIAM
export function ProtectedRoute({ actionRequired, children }: ProtectedRouteProps) {
  const { user, claims } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  if (actionRequired && !hasPermission(claims.role, actionRequired, claims.businessId)) {
    return <UnauthorizedView />;
  }

  return <>{children}</>;
}
```

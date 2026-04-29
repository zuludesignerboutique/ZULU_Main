// This file is intentionally left as a re-export only.
// The real ProductService lives in product.service.ts
// Do NOT define a second ProductService class here — it causes Angular
// to have two providers with the same name, breaking dependency injection.

export { ProductService } from './product.service';
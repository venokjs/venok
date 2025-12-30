<div align="center">

<a href="https://github.com/venokjs/venok"><img src="https://github.com/venokjs/venok/blob/next/.github/assets/logo.png?raw=true" height=200px></a>

**Blazing-fast framework for building highly efficient, infinitely scalable, and battle-tested enterprise-grade full-stack applications with TypeScript.**

[![npm version](https://badge.fury.io/js/@venok%2Fcore.svg)](https://badge.fury.io/js/@venok%2Fcore)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](https://github.com/venokjs/venok/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

[Website](https://venok.dev) • [Documentation](https://docs.venok.dev) • [Examples](https://github.com/venokjs/examples)

</div>

## 🚀 Why Venok?

Venok is a cutting-edge TypeScript framework that combines the best of modern development practices with enterprise-grade performance. Built from the ground up for scale, Venok delivers unparalleled developer experience while maintaining lightning-fast runtime performance.

Venok's architecture is built around a powerful dependency injection container that manages the entire application lifecycle:

### 🔥 Key Features

- **⚡ Lightning Fast**: Optimized for performance with minimal overhead
- **🏗️ Enterprise-Grade DI**: Powerful dependency injection system with full control over the application lifecycle
- **🌐 Multi-Protocol Support**: Built-in HTTP and WebSocket support out of the box
- **🔧 NestJS Compatible**: Seamless integration with existing NestJS packages and ecosystem
- **🎯 Type-Safe**: First-class TypeScript support with full type inference
- **📦 Modular Architecture**: Clean, scalable module system for better code organization
- **🔄 RxJS Integration**: Reactive programming with Observable streams
- **🛡️ Battle-Tested**: Production-ready with comprehensive error handling
- **📊 Advanced DI**: Request-scoped providers, circular dependency resolution, and more

## 🚀 Quick Start

### Installation

```bash
bun add @venok/core @venok/http reflect-metadata
```

### Hello World Example

```typescript
import { Injectable, Module, Controller, Get } from '@venok/core';
import { VenokFactory } from '@venok/core';
import { HttpModule } from '@venok/http';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello, World from Venok! 🚀';
  }
}

@Controller('api')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('hello')
  getHello(): string {
    return this.appService.getHello();
  }
}

@Module({
  imports: [HttpModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

async function bootstrap() {
  const app = await VenokFactory.createApplicationContext(AppModule);
  await app.listen(3000);
  console.log('🚀 Application running on http://localhost:3000');
}

bootstrap();
```

### WebSocket Example

```typescript
import { Module } from '@venok/core';
import { WebSocketModule, WebSocketGateway, SubscribeMessage, MessageBody } from '@venok/websocket';

@WebSocketGateway({ port: 8080 })
export class ChatGateway {
  @SubscribeMessage('message')
  handleMessage(@MessageBody() data: string): string {
    return `Echo: ${data}`;
  }
}

@Module({
  imports: [WebSocketModule],
  providers: [ChatGateway],
})
export class AppModule {}
```

## 🔧 Core Concepts

### Dependency Injection

Venok's DI system is designed for enterprise applications with advanced features:

```typescript
import { Injectable, Scope } from '@venok/core';

// Singleton provider (default)
@Injectable()
export class SingletonService {}

// Request-scoped provider
@Injectable({ scope: Scope.REQUEST })
export class RequestScopedService {}

// Transient provider
@Injectable({ scope: Scope.TRANSIENT })
export class TransientService {}
```

### Modules

Organize your application with a clean modular structure:

```typescript
import { Module, Global } from '@venok/core';

@Global() // Makes this module globally available
@Module({
  providers: [DatabaseService, LoggerService],
  exports: [DatabaseService], // Export for other modules
})
export class CoreModule {}

@Module({
  imports: [CoreModule],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
```

### Guards & Interceptors

Implement cross-cutting concerns with ease:

```typescript
import { CanActivate, ExecutionContext, Injectable, UseGuards, UseInterceptors } from '@venok/core';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    // Authentication logic
    return true;
  }
}

@Injectable()
export class LoggingInterceptor implements VenokInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    console.log('Before...');
    return next.handle().pipe(
      tap(() => console.log('After...'))
    );
  }
}

@Controller('protected')
@UseGuards(AuthGuard)
@UseInterceptors(LoggingInterceptor)
export class ProtectedController {
  @Get()
  getProtectedResource() {
    return { message: 'Access granted!' };
  }
}
```

## 📦 Available Packages

| Package | Description | Version |
|---------|-------------|---------|
| `@venok/core` | Core framework with DI container | ![npm](https://img.shields.io/npm/v/@venok/core) |
| `@venok/http` | HTTP server and routing | ![npm](https://img.shields.io/npm/v/@venok/http) |
| `@venok/websocket` | WebSocket gateway support | ![npm](https://img.shields.io/npm/v/@venok/websocket) |
| `@venok/integration` | NestJS compatibility layer | ![npm](https://img.shields.io/npm/v/@venok/integration) |

## 🔌 NestJS Compatibility

Venok maintains compatibility with the NestJS ecosystem:

```typescript
// Use your existing NestJS packages
import { ValidationPipe } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      // ... configuration
    }),
  ],
  // ... rest of your module
})
export class AppModule {}
```

## 🤝 Contributing

We welcome contributions from the community! Please read our [Contributing Guide](CONTRIBUTING.md) for details on how to get started.

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 🌟 Support

If you find Venok helpful, please consider giving it a ⭐ on GitHub!

For questions and support:
- 📚 [Documentation](https://venok.dev/docs)
- 💬 [Discord Community](https://discord.gg/venok)
- 🐛 [Issues](https://github.com/venokjs/venok/issues)
- 💼 [Enterprise Support](mailto:enterprise@venok.dev)

---

<div align="center">

**Built with ❤️ for the TypeScript community**

By [**shiz-ceo**](https://github.com/shiz-ceo)

</div>
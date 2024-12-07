**Step 1: Create a new module file**

Create a new file `my-new-module.module.ts` in the `modules` directory:
```html
<!-- my-new-module.module.ts -->

<!-- Import modules -->
<script src="@nestjs/common"></script>

<!-- Define the new module -->
@Module({
  controllers: [MyNewModuleController],
  providers: [MyNewModuleService]
})
export class MyNewModule { }
```
**Step 2: Import the new module into `SharedModule`**

Update `shared.module.ts` to import the new module:
```html
<!-- shared.module.ts -->

<!-- Import modules -->
<script src="@nestjs/common"></script>

<!-- Add the new module -->
@Module({
  // ...
  imports: [
    // ...
    MyNewModule,
    // ...
  ]
})
export class SharedModule { }
```
**Step 3: Create controller and service files**

Create new files `my-new-module.controller.ts` and `my-new-module.service.ts` to define the controller and service for your new module:
```html
<!-- my-new-module.controller.ts -->

<!-- Import modules -->
<script src="@nestjs/common"></script>

<!-- Define the controller -->
@Controller('my-new-module')
export class MyNewModuleController {
  @Post()
  async hello(): Promise<string> {
    return 'Hello from my new module!';
  }
}

<!-- my-new-module.service.ts -->

<!-- Import modules -->
<script src="@nestjs/common"></script>

<!-- Define the service -->
@Injectable()
export class MyNewModuleService { }
```
**Note**: Don't forget to adjust the imports and exports of your new module to match your specific use case. Also, add the new module to the `providers` array in `SharedModule` if it's a service or provider.

That's it! You have now successfully created a new module in your NestJS application.
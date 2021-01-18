# Contributing

Contributors are welcome!

See something that needs fixing? Got an idea for a new feature? Contribute a [Pull Request](#Create-a-Pull-Request)!

## Background

This project is set up as a mono-repo. We use `lerna` to manage dependencies. Thus, after the initial `npm install` (to get lerna), you will use `lerna bootstrap` in place of `npm install`. This will ensure all local package / dependies are compiled/transpiled.

## Easy path to contribution
Click the Gitpod badge to setup a ready to code dev env in the cloud.

[![Gitpod Ready-to-Code](https://img.shields.io/badge/Gitpod-Ready--to--Code-blue?logo=gitpod)](https://gitpod.io/#https://github.com/cdimascio/express-openapi-validator)

## Standard path to contribution

### Prerequisites / Setup

1. Fork the repo

   ```shell
   # The clone your copy
   git clone <forked-repo>
   ```

2. Install the dependencies for each package in the mono repo

   ```shell
   # install lerna and common deps
   npm install 

   # run lerna bootstrap to install module dependencies
   # note: use lerna bootstrap, rather than npm install
   lerna bootstrap && lerna run compile
   ```

   _**Tip:**_ Run `lerna clean && lerna bootstrap && lerna run compile` to reset the project, e.g. clean, install, and compile all packages.

3. Navigate to the package dir you'd like to modify

   **Packages:**
   - [express-openapi-validator](/packages/express-openapi-validator) - the express middleware 
   - [koa-openapi-validator](/packages/koa-openapi-validator) - the koa middleware 
   - [fastify-openapi-validator](/packages/fastify-openapi-validator) - the fastify middleware 
   - [openapi-core](/packages/openapi-core) - core schema load and preprocess logic
   

   ```shell
   # for example, navigate the express validator package
   cd packages/express-openapi-validator
   ```
3a. Compile sources for each package in the mono repo

```shell
   lerna run compile
```

3b. Compile sources a single package

```shell
   cd packages express-openapi-validator
   npm run compile
```
   
4. Be [Create a Pull Request](#create-a-pull-request) once you've written you code.

## Run the tests

1a. Run all tests in the mono repo

   ```shell
    # compile any changes
   lerna run compile
   lerna run test
   ```

1b. Run tests in one package

   Run tests in the current package:

   ```shell
   lerna run test --scope express-openapi-validator
   # or if in the package directory, you can run
   npm run test
   ```

## Debug

If you are using VSCode, see the debugger. There are configurations:
- Run Mocha Tests - allows to step through Mocha tests
- 7-Fastify Attach - allows to start the fastify example and step through code

## Develop

- Write code
- Add tests to validate new behaviors
- Ensure all tests succeed
- Create a PR
- Have fun!

## Create a Pull Request

1. Fork it
2. Clone it to your local system
3. Make a new branch
4. Make your changes
5. Push it back to your repo
6. From the Github UI, Click the Compare & pull request button 

   NOTE: this button will be present for some period of time after 5. If the button no longer there, Create pull request and select the branches manually)
6. From the Github UI, Click Create pull request to open a new pull request
7. Detailed steps with example here:

## Project structure

`src` contains the source code
`test` contains the tests

## Need help?

Reach out on [gitter](https://gitter.im/cdimascio-oss/community).

We're happy to help!

## FAQ
**Q:** I don't have permission to create a branch and I can't push my changes

**A:** You cannot directly create a branch in this repo. Instead [Create a Pull Request](#create-a-pull-request)


## Misc 
If you are not a project, you may ignore this section

### Generate Change Log

Run the following each time a release is cut.

```shell
npm install -g conventional-changelog-cli
conventional-changelog -p express-openapi-validator -i CHANGE_HISTORY.md -s
```

## Thanks!

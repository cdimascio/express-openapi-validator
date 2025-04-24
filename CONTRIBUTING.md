# Contributing

Contributors are welcome!

See something that needs fixing? Got an idea for a new feature? Contribute a [Pull Request](#Create-a-Pull-Request)!

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

2. Install the dependencies

   ```shell
   # From the project directory, run
   npm i
   ```
   
Be [Create a Pull Request](#create-a-pull-request) once you've written you code.

## Run the tests

3. Run the tests

   ```shell
   npm test

   ## Run tests against express@4 and express@latest
   npm run test:all

   ## Run tests against express@4 only
   ## NOTE: remember to reinstall express@latest after the run (or run npm run test:express does it automatically)
   npm run test:with-express4
   
   ## To continue testing express@4 after running the preceding command, you may now simply run npm test as npm run test:with-express4 installs express@4 
   npm test
   ```

4. Update documentation

   Create a PR at - [https://cdimascio.github.io/express-openapi-validator-documentation](https://cdimascio.github.io/express-openapi-validator-documentation)

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

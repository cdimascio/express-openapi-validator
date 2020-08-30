# Services Folder

Services define routes within your application. Fastify provides an
easy path to a microservice architecture, in the future you might want
to independently deploy some of those.

In this folder you should define all the services that define the routes
of your web application.
Each service is a [Fastify
plugin](https://www.fastify.io/docs/latest/Plugins/), it is
encapsulated (it can have its own independent plugins) and it is
typically stored in a file; be careful to group your routes logically,
e.g. all `/users` routes in a `users.js` file. We have added
a `root.js` file for you with a '/' root added.

If a single file become too large, create a folder and add a `index.js` file there:
this file must be a Fastify plugin, and it will be loaded automatically
by the application. You can now add as many files as you want inside that folder.
In this way you can create complex services within a single monolith,
and eventually extract them.

If you need to share functionality between services, place that
functionality into the `plugins` folder, and share it via
[decorators](https://www.fastify.io/docs/latest/Decorators/).

If you have a bit confused about using `async/await` write services, you would better take a look at [Promise resolution](https://github.com/fastify/fastify/blob/master/docs/Routes.md#promise-resolution) for more details.

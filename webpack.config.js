const { resolve, join, dirname } = require('path');
const { readFileSync: readFile } = require('fs');

const { sync: findUp } = require('find-up');
const { create: { sync: createResolver } } = require('enhanced-resolve');
const isBuiltin = require('is-builtin-module');

const isESNext = path => {
    return !path.includes('node_modules') ||
        // XXX: removing "module" from this regex "fixes" the issue..
        /"((e|j)snext(:[a-z]+)?|module)": ?"/m.test(
            readFile(findUp('package.json', { cwd: dirname(path) }), 'utf8')
        );
};

const isExternal = () => {
    const resolve = createResolver();
    const shouldBeBundled = (context, request) => {
        if (isBuiltin(request)) return false;
        try {
            const resolved = resolve(context, request);
            return isESNext(resolved);
        } catch (_) {
            return true;
        }
    };
    return (context, request, callback) => {
        if (shouldBeBundled(context, request)) {
            callback();
        } else {
            callback(null, 'commonjs ' + request);
        }
    };
};

module.exports = {
    name: 'node',
    target: 'node',
    mode: 'development',
    entry: require.resolve('./index.js'),
    output: {
        path: join(__dirname, 'dist'),
        filename: 'server.js',
        libraryTarget: 'commonjs2',
    },
    resolve: {
        extensions: ['.js'],
        mainFields: [
            'esnext',
            'jsnext',
            'esnext:main',
            'jsnext:main',
            'module',
            'main',
        ],
    },
    module: {
        rules: [
            {
                test: [/\.js$/],
                include: isESNext,
                loader: require.resolve('babel-loader'),
                options: {
                    babelrc: false,
                    compact: false,
                    cacheDirectory: true,
                    cacheIdentifier: 'development:node',
                    presets: [
                        [
                            require.resolve('babel-preset-env'),
                            {
                                modules: false,
                                useBuiltIns: true,
                                targets: { node: 'current' },
                            },
                        ],
                    ],
                    plugins: [
                        require.resolve('babel-plugin-dynamic-import-node'),
                        require.resolve('babel-plugin-transform-class-properties'),
                        require.resolve('babel-plugin-transform-object-rest-spread'),
                    ],
                },
            }
        ],
    },
    externals: isExternal(),
};

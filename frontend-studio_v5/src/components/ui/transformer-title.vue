<template>
    <div class="transformer-title">
        <h1 :class="'title ' + size + ' ' + textAlign" style="color: var(--primary-color); margin: 70px 10px 10px 10px">
            <span style="border: 3px solid var(--primary-color); padding: 5px 25px; position: relative; display: inline-block">
                {{ content }}
                <svg
                    class="corner topleft"
                    viewBox="0 0 34 34"
                    version="1.1"
                    xmlns="http://www.w3.org/2000/svg"
                    xmlns:svg="http://www.w3.org/2000/svg">
                    <g>
                        <rect
                            style="
                                opacity: 0.99;
                                fill: #ffffff;
                                stroke: var(--primary-color);
                                stroke-width: 4;
                                stroke-dasharray: none;
                                stroke-opacity: 1;
                            "
                            width="30"
                            height="30"
                            x="0"
                            y="0" />
                    </g>
                </svg>
                <svg
                    class="corner bottomleft"
                    viewBox="0 0 34 34"
                    version="1.1"
                    xmlns="http://www.w3.org/2000/svg"
                    xmlns:svg="http://www.w3.org/2000/svg">
                    <g>
                        <rect
                            style="
                                opacity: 0.99;
                                fill: #ffffff;
                                stroke: var(--primary-color);
                                stroke-width: 4;
                                stroke-dasharray: none;
                                stroke-opacity: 1;
                            "
                            width="30"
                            height="30"
                            x="0"
                            y="0" />
                    </g>
                </svg>
                <svg
                    class="corner bottomright"
                    viewBox="0 0 34 34"
                    version="1.1"
                    xmlns="http://www.w3.org/2000/svg"
                    xmlns:svg="http://www.w3.org/2000/svg">
                    <g>
                        <rect
                            style="
                                opacity: 0.99;
                                fill: #ffffff;
                                stroke: var(--primary-color);
                                stroke-width: 4;
                                stroke-dasharray: none;
                                stroke-opacity: 1;
                            "
                            width="30"
                            height="30"
                            x="0"
                            y="0" />
                    </g>
                </svg>
                <svg
                    class="corner topright"
                    viewBox="0 0 34 34"
                    version="1.1"
                    xmlns="http://www.w3.org/2000/svg"
                    xmlns:svg="http://www.w3.org/2000/svg">
                    <g>
                        <rect
                            style="
                                opacity: 0.99;
                                fill: #ffffff;
                                stroke: var(--primary-color);
                                stroke-width: 4;
                                stroke-dasharray: none;
                                stroke-opacity: 1;
                            "
                            width="30"
                            height="30"
                            x="0"
                            y="0" />
                    </g>
                </svg>
                <svg
                    style="position: absolute; top: -86px; left: 50%; width: 15px; height: 100px"
                    viewBox="0 0 34 100"
                    version="1.1"
                    xmlns="http://www.w3.org/2000/svg"
                    xmlns:svg="http://www.w3.org/2000/svg">
                    <g>
                        <rect
                            style="
                                opacity: 0.99;
                                fill: #ffffff;
                                stroke: var(--primary-color);
                                stroke-width: 4;
                                stroke-dasharray: none;
                                stroke-opacity: 1;
                            "
                            width="30"
                            height="30"
                            x="0"
                            y="0" />
                        <rect
                            width="4"
                            height="100"
                            y="30"
                            style="
                                opacity: 0.99;
                                fill: var(--primary-color);
                                stroke: var(--primary-color);
                                stroke-width: 2px;
                                stroke-dasharray: none;
                                stroke-opacity: 1;
                            "
                            x="13" />
                    </g>
                </svg>
            </span>
        </h1>
    </div>
</template>

<script>
export default {
    name: 'transformer-title',
    props: {
        content: {
            type: String,
            default: '',
        },
        textAlign: {
            type: String,
            default: 'left',
        },
        size: {
            type: String,
            default: 'large',
        },
    },
};
</script>

<style scoped lang="scss">
.transformer-title {
    h1 {
        &.left {
            text-align: left;
        }
        &.center {
            text-align: center;
        }
        &.large {
            font-size: 5em;
            @media screen and (max-width: 768px) {
                font-size: 3.5em;
                text-align: center;
            }
        }
        &.small {
            font-size: 2em;
        }
    }

    .corner {
        position: absolute;
        width: 15px;
        height: 15px;

        &.topleft {
            top: -8px;
            left: -9px;
        }
        &.bottomleft {
            bottom: -8px;
            left: -9px;
        }
        &.topright {
            top: -8px;
            right: -9px;
        }
        &.bottomright {
            bottom: -8px;
            right: -9px;
        }
    }
}
</style>

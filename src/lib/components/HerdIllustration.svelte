<script lang="ts">
    // The herd at the bottom of the home page: hand-drawn brontosauruses in the orange's shades and sizes. Not the
    // Brontosound mark, which is never recoloured
    const HEAD_LOW = 'M10 24C9 18 15 13 23 13C30 13 34 18 34 24C35 38 44 54 62 60C70 62 76 58 86 53C100 46 122 44 138 54C150 61 158 72 166 82C176 94 188 104 199 112C186 112 168 106 152 99L150 128L136 128L136 104L130 104L130 126L119 126L118 100C108 103 96 103 88 100L88 128L74 128L74 104L69 104L69 126L59 126L58 92C50 84 40 66 31 44C29 37 25 31 19 31C14 31 10 28 10 24Z';
    const HEAD_UP = 'M14 12C13 6 19 1 27 1C34 1 38 6 38 12C38 32 44 52 62 60C70 62 76 58 86 53C100 46 122 44 138 54C150 61 158 72 166 82C176 94 188 104 199 112C186 112 168 106 152 99L150 128L136 128L136 104L130 104L130 126L119 126L118 100C108 103 96 103 88 100L88 128L74 128L74 104L69 104L69 126L59 126L58 92C50 82 38 58 35 32C34 25 30 19 24 19C18 19 14 16 14 12Z';

    // Far ones first, pale and small; then the near ones
    const herd = [
        { path: HEAD_LOW, fill: '#FFD5CC', left: '4%', bottom: 34, width: 120, flip: true },
        { path: HEAD_UP, fill: '#FFBCAD', left: '25%', bottom: 36, width: 92 },
        { path: HEAD_UP, fill: '#FFD5CC', left: '57%', bottom: 34, width: 136, flip: true },
        { path: HEAD_LOW, fill: '#FFBCAD', left: '80%', bottom: 36, width: 104 },
        { path: HEAD_UP, fill: '#CC4522', left: '-3%', bottom: 10, width: 270, flip: true, eye: [24, 8] },
        { path: HEAD_LOW, fill: '#FE795D', left: '16%', bottom: 12, width: 156, eye: [20, 20] },
        { path: HEAD_LOW, fill: '#EF562F', left: 'calc(16% + 150px)', bottom: 12, width: 70 },
        { path: HEAD_UP, fill: '#EB4F27', left: '37%', bottom: 8, width: 340, flip: true, eye: [24, 8] },
        { path: HEAD_LOW, fill: '#A5371B', left: '64%', bottom: 12, width: 200, eye: [20, 20] },
        { path: HEAD_UP, fill: '#FE795D', left: 'calc(64% + 196px)', bottom: 12, width: 78 },
        { path: HEAD_UP, fill: '#EF562F', left: '86%', bottom: 10, width: 290, eye: [24, 8] },
    ];
</script>

<div aria-hidden="true" class="relative mt-14 h-80 overflow-hidden">
    <div class="absolute inset-x-0 bottom-0 h-11 border-t border-primary-200 bg-primary-50"></div>
    {#each herd as bronto}
        <svg viewBox="0 0 200 130" class="absolute" style="left: {bronto.left}; bottom: {bronto.bottom}px; width: {bronto.width}px; {bronto.flip ? 'transform: scaleX(-1)' : ''}">
            <path fill={bronto.fill} d={bronto.path} />
            {#if bronto.eye}<circle cx={bronto.eye[0]} cy={bronto.eye[1]} r="1.6" fill="#FFFFFF" />{/if}
        </svg>
    {/each}
</div>

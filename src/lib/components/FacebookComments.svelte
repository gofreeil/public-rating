<script lang="ts">
    import { onMount } from 'svelte';
    import { browser } from '$app/environment';

    export let url = '';
    export let numPosts = 5;
    export let width = '100%';
    export let appId = ''; // יש להוסיף App ID של פייסבוק

    let fbLoaded = false;

    onMount(() => {
        if (browser) {
            // טעינת Facebook SDK
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (window as any).fbAsyncInit = function() {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (window as any).FB.init({
                    appId: appId || 'YOUR_APP_ID', // צריך להחליף ב-App ID אמיתי
                    xfbml: true,
                    version: 'v18.0'
                });
                fbLoaded = true;
            };

            (function(d, s, id) {
                var js, fjs = d.getElementsByTagName(s)[0];
                if (d.getElementById(id)) return;
                js = d.createElement(s) as HTMLScriptElement;
                js.id = id;
                js.src = 'https://connect.facebook.net/he_IL/sdk.js';
                fjs.parentNode?.insertBefore(js, fjs);
            }(document, 'script', 'facebook-jssdk'));
        }
    });
</script>

<div id="fb-root"></div>

<div class="facebook-comments-wrapper">
    <div class="mb-4 p-4 bg-blue-900/20 rounded-lg border border-blue-500/30">
        <div class="flex items-center gap-2 mb-2">
            <svg class="w-6 h-6 text-blue-400" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            <h4 class="text-white font-bold">תגובות פייסבוק</h4>
        </div>
        <p class="text-gray-400 text-sm">
            התחבר עם חשבון הפייסבוק שלך כדי להגיב ולהצטרף לשיחה
        </p>
    </div>

    {#if !appId || appId === 'YOUR_APP_ID'}
        <div class="p-6 bg-yellow-900/20 border border-yellow-500/30 rounded-lg text-center">
            <p class="text-yellow-300 font-bold mb-2">⚠️ נדרש הגדרת App ID של פייסבוק</p>
            <p class="text-gray-400 text-sm mb-4">
                כדי להפעיל את מערכת התגובות, יש צורך ב-App ID מפייסבוק
            </p>
            <a
                href="https://developers.facebook.com/apps/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="צור App ID בפייסבוק (נפתח בחלון חדש)"
                class="inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors"
            >
                צור App ID בפייסבוק
            </a>
        </div>
    {:else}
        <div 
            class="fb-comments" 
            data-href={url || (browser ? window.location.href : '')}
            data-width={width}
            data-numposts={numPosts}
            data-colorscheme="dark"
        ></div>
    {/if}
</div>

<style>
    .facebook-comments-wrapper {
        width: 100%;
        margin: 2rem 0;
    }
</style>

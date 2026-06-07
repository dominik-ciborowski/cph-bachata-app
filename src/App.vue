<template>
  <header class="topbar">
    <RouterLink to="/" class="brand">Bachata CPH</RouterLink>
    <nav v-if="false">
      <RouterLink to="/">Events</RouterLink>
    </nav>
  </header>
  <main class="container">
    <RouterView />
  </main>
</template>

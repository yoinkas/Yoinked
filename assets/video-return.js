document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-video-return]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("video").forEach((video) => {
        video.pause();
      });
    });
  });
});

    $(function () {
      var inbox = $(".inbox-switch");
      inbox.find(".inbox").on("click", function () {
        var $this = $(this);

        if ($this.hasClass("active")) return;

        var direction = $this.attr("inbox-direction");

        inbox.removeClass("left right").addClass(direction);
        inbox.find(".inbox.active").removeClass("active");
        $this.addClass("active");
      });
    });
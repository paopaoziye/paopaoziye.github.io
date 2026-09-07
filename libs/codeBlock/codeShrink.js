// 代码块收缩

$(function () {
  var $code_expand = $('<button type="button" class="fas fa-angle-up code-expand" aria-label="展开或收起代码" aria-expanded="true"></button>');

  $('.code-area').prepend($code_expand);
  $('.code-expand').on('click', function () {
    if ($(this).parent().hasClass('code-closed')) {
      $(this).siblings('pre').find('code').show();
      $(this).parent().removeClass('code-closed');
      $(this).attr('aria-expanded', 'true');
    } else {
      $(this).siblings('pre').find('code').hide();
      $(this).parent().addClass('code-closed');
      $(this).attr('aria-expanded', 'false');
    }
  });
});

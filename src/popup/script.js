document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('actionBtn');
    
    btn.addEventListener('click', () => {
        btn.textContent = '已点击！';
        console.log('按钮被点击了 - leaf-tab');
    });
});
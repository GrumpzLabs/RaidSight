const input = document.querySelector('#video-input');
const dropzone = document.querySelector('#dropzone');
const title = document.querySelector('#upload-title');
const copy = document.querySelector('#upload-copy');
const analyze = document.querySelector('#analyze-button');
const toast = document.querySelector('#toast');

function selectFile(file) {
  if (!file) return;
  if (!file.type.startsWith('video/')) return showToast('Please choose a video file.');
  title.textContent = file.name;
  copy.textContent = `${(file.size / 1024 / 1024).toFixed(1)} MB · Ready to review`;
  analyze.disabled = false;
  dropzone.classList.add('dragging');
}
function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3200);
}
input.addEventListener('change', e => selectFile(e.target.files[0]));
['dragenter', 'dragover'].forEach(event => dropzone.addEventListener(event, e => { e.preventDefault(); dropzone.classList.add('dragging'); }));
['dragleave', 'drop'].forEach(event => dropzone.addEventListener(event, e => { e.preventDefault(); dropzone.classList.remove('dragging'); }));
dropzone.addEventListener('drop', e => selectFile(e.dataTransfer.files[0]));
document.querySelector('#link-button').addEventListener('click', () => {
  const value = document.querySelector('#log-url').value.trim();
  if (!value) return showToast('Paste a Warcraft Logs URL first.');
  showToast('Log linked. Add a recording to start the review.');
});
analyze.addEventListener('click', () => {
  analyze.disabled = true;
  analyze.querySelector('span').textContent = 'Preparing your review…';
  showToast('Upload flow ready — processing will connect here next.');
  setTimeout(() => { analyze.disabled = false; analyze.querySelector('span').textContent = 'Analyze my run'; }, 2200);
});

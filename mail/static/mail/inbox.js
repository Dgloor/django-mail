document.addEventListener("DOMContentLoaded", function () {
  // Use buttons to toggle between views
  document
    .querySelector("#inbox")
    .addEventListener("click", () => load_mailbox("inbox"));
  document
    .querySelector("#sent")
    .addEventListener("click", () => load_mailbox("sent"));
  document
    .querySelector("#archived")
    .addEventListener("click", () => load_mailbox("archive"));
  document.querySelector("#compose").addEventListener("click", compose_email);

  // By default, load the inbox
  load_mailbox("inbox");

  document
    .querySelector("#compose-form")
    .addEventListener("submit", () => send_mail(event), false);
});

function compose_email() {
  // Show compose view and hide other views
  document.querySelector("#emails-view").style.display = "none";
  document.querySelector("#compose-view").style.display = "block";

  // Clear out composition fields
  document.querySelector("#compose-recipients").value = "";
  document.querySelector("#compose-subject").value = "";
  document.querySelector("#compose-body").value = "";
}

const load_mailbox = (mailbox) => {
  // Show the mailbox and hide other views
  document.querySelector("#emails-view").style.display = "block";
  document.querySelector("#compose-view").style.display = "none";

  // Show the mailbox name
  document.querySelector("#emails-view").innerHTML = `<h3>${
    mailbox.charAt(0).toUpperCase() + mailbox.slice(1)
  }</h3>`;

  load_content(mailbox);
};

async function load_content(mailbox) {
  res = await fetch(`/emails/${mailbox}`);
  emails = await res.json();

  emails.forEach((mail) => {
    if (mailbox != "sent") {
      sender_recipients = mail.sender;
    } else {
      sender_recipients = mail.recipients;
    }

    let is_read = "";
    if (mail.read) {
      if (mailbox == "inbox" || mailbox == "archive") {
        is_read = "read";
      }
    }

    let item = document.createElement("div");
    item.className = `card ${is_read} my-1 items`;
    item.innerHTML = `<div class="card-body" id="item-${mail.id}">
      <div class="row justify-content-between" >
        <div class="col-4">
          <b> ${sender_recipients} </b>
          ${mail.subject}
        </div>
        <div class="col-3 time">
          ${mail.timestamp}
          </div> 
        </div>
    </div>`;

    document.querySelector("#emails-view").appendChild(item);
    item.addEventListener("click", () => {
      view_mail(mail.id, mailbox);
    });
  });
}

async function view_mail(id, mailbox) {
  const res = await fetch(`/emails/${id}`);
  const mail = await res.json();

  document.querySelector("#emails-view").innerHTML = "";

  let item = document.createElement("div");
  item.className = `card`;

  let content = `<div class="card-body" style="white-space: pre-wrap;">
<b> From:</b> ${mail.sender}
<b> To:</b> ${mail.recipients}
<b> Subject:</b> ${mail.subject}
<b> Timestamp:</b> ${mail.timestamp}
<hr />${mail.body} </div>`;

  item.innerHTML = content;
  document.querySelector("#emails-view").appendChild(item);

  if (mailbox != "sent") {
    let reply_btn = document.createElement("btn");
    let archive_btn = document.createElement("btn");

    reply_btn.className = `btn btn-outline-success m-2`;
    archive_btn.className = `btn btn-outline-danger my-2`;

    reply_btn.textContent = "Reply";
    archive_btn.textContent = "Archive";
    if (mail.archived) archive_btn.textContent = "Unarchive";

    reply_btn.addEventListener("click", () => {
      reply_mail(mail.sender, mail.subject, mail.body, mail.timestamp);
    });
    archive_btn.addEventListener("click", () => {
      toggle_archive(id, mail.archived);
    });

    document.querySelector("#emails-view").appendChild(reply_btn);
    document.querySelector("#emails-view").appendChild(archive_btn);
  }

  if (!mail.read) {
    mark_read(id);
  }
}

async function toggle_archive(id, is_archived) {
  await fetch(`/emails/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      archived: !is_archived,
    }),
  });
  // if (is_archived) {
  load_mailbox("inbox");
  // } else {
  // load_mailbox("archive");
  // }
}

const mark_read = (id) => {
  fetch(`/emails/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      read: true,
    }),
  });
};

const reply_mail = (sender, subject, body, timestamp) => {
  compose_email();
  if (!/^Re:/.test(subject)) subject = `Re: ${subject}`;
  document.querySelector("#compose-recipients").value = sender;
  document.querySelector("#compose-subject").value = subject;

  pre = `On ${timestamp} ${sender} wrote:\n${body}\n\n\n`;

  document.querySelector("#compose-body").value = pre;
};

async function send_mail(event) {
  event.preventDefault();
  to = document.querySelector("#compose-recipients");
  subject = document.querySelector("#compose-subject");
  body = document.querySelector("#compose-body");

  const res = await fetch("/emails", {
    method: "POST",
    body: JSON.stringify({
      recipients: to.value,
      subject: subject.value,
      body: body.value,
    }),
  });

  const data = await res.json();

  if (res.status == 201) {
    load_mailbox("sent");
    toastr.success(`${data.message}`, "Message", { timeOut: 3000 });
  } else {
    toastr.error(`${data.error}`, "Error!", { timeOut: 2000 });
  }
}

class main {
  constructor(tp, journal_location) {
    this.tp = tp;
    this.today = tp.file.title.substring(0, 10);
    this.journal_location = journal_location;

    for (const method of Object.getOwnPropertyNames(main.prototype)) {
      if (typeof this[method] === 'function' && method !== 'constructor') {
        this[method] = this[method].bind(this);
      }
    }
  }

  recurring_task(text) {
    return text + ' ➕ ' + this.today + ' 📅 ' + this.today + ' #recurring';
  }

  file_date(string, offset) {
    if (!offset === undefined) {
      offset = 0;
    }
    return this.tp.date.now(string, offset, this.today, 'YYYY-MM-DD');
  }

  build_file_title(offset) {
    return this.journal_location + '/' + this.file_date("YYYY/MM/YYYY-MM-DD", offset);
  }

  async create_sub_file(name, content) {
    await this.tp.file.create_new(content, this.build_file_title() + "/" + name);
  }

  async build_sub_files() {
    const folder_exists = await this.tp.file.exists(this.build_file_title());
    if (!folder_exists) {
      await app.vault.createFolder(this.build_file_title());
      await this.create_sub_file('Todo', this.tp.file.find_tfile("Todo Template"));
      await this.create_sub_file('Exercise', this.tp.file.find_tfile("Exercise Template"));
    }
  }

  async roll_over_todos() {
    if (this.today > this.tp.date.now()) {
      return;
    }

    const todo_files = app.vault.getFiles()
      .filter(filter => filter.path.startsWith(this.journal_location + '/'))
      .filter(filter => filter.path.endsWith("/Todo.md"))
      .filter(filter => {
        const file_container_date = filter.path.match(/\d{4}-\d{2}-\d{2}/)[0];
        return file_container_date < this.tp.date.now()
      });

    let todos = [];
    for (const file of todo_files) {
      const file_content = await app.vault.read(file);
      const file_todos = file_content.match(/- \[ \] .*/g);
      todos = todos.concat(file_todos);
    };

    const current_todo_file = await this.tp.file.find_tfile(this.build_file_title() + "/" + 'Todo');
    await app.vault.append(current_todo_file, todos.join("\n"));

    for (const file of todo_files) {
      await app.vault.delete(file);
    }
  }

  async build_next_file() {
    const cutoff_date = this.tp.date.now("YYYY-MM-DD", 1);
    const full_file_name = this.build_file_title(1) + ".md";
    const file_exists = await this.tp.file.exists(full_file_name);

    if (file_exists) {
      await app.vault.delete(app.vault.getAbstractFileByPath(full_file_name));
    }
    if (this.today != cutoff_date) {
      await this.tp.file.create_new(
        this.tp.file.find_tfile("Daily Note Template"), this.build_file_title(1)
      );
    }
  }
}

module.exports = main;

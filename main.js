class main {
  constructor(tp, journal_location) {
    this.tp = tp;
    if (tp.file.title === 'Todo') {
      this.today = tp.file.path(true).replace(/.*\/(\d{4}-\d{2}-\d{2})\/Todo/, '$1');
    } else {
      this.today = tp.file.title;
    }
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

  build_full_file_path(offset) {
    return this.journal_location + '/' + this.file_date("YYYY/MM/YYYY-MM-DD", offset);
  }

  build_sub_file_path(name) {
    return this.build_full_file_path() + "/" + name
  }

  async create_sub_file(name, content) {
    return await this.tp.file.create_new(content, this.build_sub_file_path(name));
  }

  async sub_file_exists(name) {
    return await this.tp.file.exists(this.build_sub_file_path(name) + '.md')
  }

  async build_sub_files() {
    const folder_exists = await this.tp.file.exists(this.build_full_file_path());
    if (!folder_exists) {
      await app.vault.createFolder(this.build_full_file_path());
    }

    if (!await this.sub_file_exists('Todo')) {
      await this.create_sub_file('Todo', this.tp.file.find_tfile("Todo Template"));
    }
    if (!await this.sub_file_exists('Done')) {
      await this.create_sub_file('Done', '');
    }
    if (await this.sub_file_exists('Exercise')) {
      await app.vault.delete(app.vault.getAbstractFileByPath(this.build_sub_file_path('Exercise') + ".md"));
    }

    await this.create_sub_file('Exercise', this.tp.file.find_tfile("Exercise Template"));
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

    const current_todo_file = await this.tp.file.find_tfile(this.build_full_file_path() + "/" + 'Todo');
    await app.vault.append(current_todo_file, todos.join("\n"));

    for (const todo_file of todo_files) {
      const todo_file_content = await app.vault.read(todo_file);
      const completed_todos = todo_file_content.match(/- \[x\] .*/g);
      const file_directory = todo_file.path.substring(0, todo_file.path.lastIndexOf('/'));

      const current_done_file = await this.tp.file.find_tfile(file_directory + '/Done');
      await app.vault.append(current_done_file, completed_todos.join("\n"));
      await app.vault.delete(todo_file);
    }
  }
}

module.exports = main;
